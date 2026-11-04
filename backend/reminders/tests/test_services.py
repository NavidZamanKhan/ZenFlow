from datetime import timedelta
from io import StringIO
from unittest.mock import ANY, MagicMock, patch
from zoneinfo import ZoneInfo

from django.contrib.auth import get_user_model
from django.core.management import call_command
from django.test import TestCase, override_settings
from django.utils import timezone

from reminders.models import Reminder, ReminderNotification
from reminders.services import dispatch_due_reminders, email_retry_delay, fire_reminder
from reminders.signals import reminder_fired
from reminders.tasks import dispatch_due_reminders as celery_dispatch
from tasks.models import Task

User = get_user_model()


class DispatchDueRemindersTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            email="dispatch@example.com", password="Password123!", full_name="Dispatch User"
        )
        self.now = timezone.now()

    def _reminder(self, title="Due", minutes=-5, channel=Reminder.Channel.IN_APP, **extra):
        return Reminder.objects.create(
            user=self.user,
            title=title,
            remind_at=self.now + timedelta(minutes=minutes),
            channel=channel,
            **extra,
        )

    def test_fires_due_reminders_and_skips_future_ones(self):
        due = self._reminder("Due", minutes=-5)
        future = self._reminder("Future", minutes=+30)

        result = dispatch_due_reminders(now=self.now)

        self.assertEqual(result.dispatched, 1)
        self.assertEqual(result.notifications_created, 1)
        self.assertEqual(result.failed, 0)

        due.refresh_from_db()
        future.refresh_from_db()
        self.assertEqual(due.status, Reminder.Status.SENT)
        self.assertEqual(due.sent_at, self.now)
        self.assertEqual(future.status, Reminder.Status.SCHEDULED)

        notification = ReminderNotification.objects.get(reminder=due)
        self.assertEqual(notification.user, self.user)
        self.assertEqual(notification.title, "Due")
        self.assertEqual(notification.href, "/dashboard")
        self.assertIsNone(notification.read_at)

    def test_is_idempotent(self):
        self._reminder("Once", minutes=-1)
        first = dispatch_due_reminders(now=self.now)
        second = dispatch_due_reminders(now=self.now)
        self.assertEqual(first.dispatched, 1)
        self.assertEqual(second.dispatched, 0)
        self.assertEqual(ReminderNotification.objects.count(), 1)

    def test_cancelled_reminders_are_ignored(self):
        self._reminder("Cancelled", minutes=-1, status=Reminder.Status.CANCELLED)
        result = dispatch_due_reminders(now=self.now)
        self.assertEqual(result.dispatched, 0)
        self.assertEqual(ReminderNotification.objects.count(), 0)

    def test_respects_batch_size_and_fires_oldest_first(self):
        oldest = self._reminder("Oldest", minutes=-30)
        self._reminder("Newer", minutes=-10)

        result = dispatch_due_reminders(now=self.now, batch_size=1)
        self.assertEqual(result.dispatched, 1)
        oldest.refresh_from_db()
        self.assertEqual(oldest.status, Reminder.Status.SENT)
        self.assertEqual(Reminder.objects.filter(status=Reminder.Status.SCHEDULED).count(), 1)

    @patch("reminders.services.get_email_service")
    def test_email_channel_sends_email_without_in_app_notification(self, mock_factory):
        mock_service = mock_factory.return_value
        self._reminder("Email me", minutes=-1, channel=Reminder.Channel.EMAIL, message="Details")

        result = dispatch_due_reminders(now=self.now)

        self.assertEqual(result.dispatched, 1)
        self.assertEqual(result.emails_sent, 1)
        self.assertEqual(result.notifications_created, 0)
        mock_service.send_reminder_email.assert_called_once()
        kwargs = mock_service.send_reminder_email.call_args.kwargs
        self.assertEqual(kwargs["to_email"], "dispatch@example.com")
        self.assertEqual(kwargs["title"], "Email me")
        self.assertEqual(kwargs["message"], "Details")
        self.assertEqual(ReminderNotification.objects.count(), 0)

    @patch("reminders.services.get_email_service")
    def test_both_channel_creates_notification_and_sends_email(self, mock_factory):
        mock_service = mock_factory.return_value
        self._reminder("Both", minutes=-1, channel=Reminder.Channel.BOTH)

        result = dispatch_due_reminders(now=self.now)

        self.assertEqual(result.notifications_created, 1)
        self.assertEqual(result.emails_sent, 1)
        mock_service.send_reminder_email.assert_called_once()

    @patch("reminders.services.get_email_service")
    def test_email_failure_keeps_reminder_pending_and_records_error(self, mock_factory):
        """A failed email must not be reported as delivered: the in-app leg
        completes, the reminder stays scheduled with a retry deadline."""
        mock_service = mock_factory.return_value
        mock_service.send_reminder_email.side_effect = RuntimeError("smtp down")
        reminder = self._reminder("Flaky", minutes=-1, channel=Reminder.Channel.BOTH)

        with self.assertLogs("reminders.services", level="ERROR"):
            result = dispatch_due_reminders(now=self.now)

        self.assertEqual(result.dispatched, 1)
        self.assertEqual(result.emails_sent, 0)
        self.assertEqual(result.emails_failed, 1)
        self.assertEqual(result.notifications_created, 1)
        reminder.refresh_from_db()
        self.assertEqual(reminder.status, Reminder.Status.SCHEDULED)
        self.assertIsNone(reminder.sent_at)
        self.assertIsNone(reminder.email_sent_at)
        self.assertIsNotNone(reminder.notification_sent_at)
        self.assertEqual(reminder.email_attempts, 1)
        self.assertIsNotNone(reminder.next_attempt_at)
        self.assertGreater(reminder.next_attempt_at, self.now)
        self.assertIn("smtp down", reminder.last_error)
        self.assertIn("attempt 1/", reminder.last_error)

    def test_href_points_at_linked_task_or_event(self):
        task = Task.objects.create(user=self.user, title="Pay rent")
        reminder = self._reminder("Task reminder", minutes=-1, task=task)
        notification = fire_reminder(reminder, now=self.now)
        self.assertEqual(notification.href, "/dashboard/tasks")

    def test_emits_reminder_fired_signal(self):
        handler = MagicMock()
        reminder_fired.connect(handler)
        try:
            reminder = self._reminder("Signal", minutes=-1)
            dispatch_due_reminders(now=self.now)
        finally:
            reminder_fired.disconnect(handler)

        handler.assert_called_once()
        kwargs = handler.call_args.kwargs
        self.assertEqual(kwargs["reminder"].id, reminder.id)
        self.assertIsNotNone(kwargs["notification"])

    def test_management_command_dispatches(self):
        self._reminder("Via command", minutes=-1)
        out = StringIO()
        call_command("fire_due_reminders", stdout=out)
        self.assertIn("Dispatched 1 reminder(s)", out.getvalue())
        self.assertEqual(ReminderNotification.objects.count(), 1)

    def test_celery_task_runs_dispatcher(self):
        self._reminder("Via celery", minutes=-1)
        result = celery_dispatch.apply().get()
        self.assertEqual(result["dispatched"], 1)
        self.assertEqual(ReminderNotification.objects.count(), 1)

    def test_fires_reminders_stored_in_a_non_utc_timezone(self):
        """Due detection compares instants, not wall-clock strings."""
        dhaka = ZoneInfo("Asia/Dhaka")  # UTC+6, no DST
        due_local = (self.now - timedelta(minutes=1)).astimezone(dhaka)
        future_local = (self.now + timedelta(minutes=30)).astimezone(dhaka)
        due = Reminder.objects.create(user=self.user, title="Dhaka due", remind_at=due_local)
        future = Reminder.objects.create(user=self.user, title="Dhaka future", remind_at=future_local)

        result = dispatch_due_reminders(now=self.now)

        due.refresh_from_db()
        future.refresh_from_db()
        self.assertEqual(result.dispatched, 1)
        self.assertEqual(due.status, Reminder.Status.SENT)
        self.assertEqual(future.status, Reminder.Status.SCHEDULED)
        # Stored as the same instant, exposed in UTC.
        self.assertEqual(due.remind_at, due_local)
        self.assertEqual(due.remind_at.utcoffset(), timedelta(0))

    def test_claim_failure_leaves_reminder_scheduled_and_continues_batch(self):
        bad = self._reminder("Bad", minutes=-2)
        good = self._reminder("Good", minutes=-1)
        real_create = ReminderNotification.objects.create

        def flaky_create(**kwargs):
            if kwargs["reminder"].id == bad.id:
                raise RuntimeError("db hiccup")
            return real_create(**kwargs)

        with patch.object(ReminderNotification.objects, "create", side_effect=flaky_create):
            with self.assertLogs("reminders.services", level="ERROR"):
                result = dispatch_due_reminders(now=self.now)

        bad.refresh_from_db()
        good.refresh_from_db()
        self.assertEqual((result.dispatched, result.failed), (1, 1))
        self.assertEqual(bad.status, Reminder.Status.SCHEDULED)  # retried next tick
        self.assertIsNone(bad.notification_sent_at)
        self.assertEqual(good.status, Reminder.Status.SENT)
        self.assertEqual(ReminderNotification.objects.count(), 1)


class ReminderFiredSignalTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            email="signal@example.com", password="Password123!", full_name="Signal User"
        )
        self.now = timezone.now()

    def test_receiver_exception_does_not_roll_back_delivery(self):
        reminder = Reminder.objects.create(
            user=self.user, title="Robust", remind_at=self.now - timedelta(minutes=1)
        )

        def exploding_receiver(**kwargs):
            raise ValueError("receiver crashed")

        reminder_fired.connect(exploding_receiver, dispatch_uid="test-exploding-receiver")
        try:
            with self.assertLogs("reminders.services", level="ERROR") as logs:
                result = dispatch_due_reminders(now=self.now)
        finally:
            reminder_fired.disconnect(dispatch_uid="test-exploding-receiver")

        reminder.refresh_from_db()
        self.assertEqual(result.dispatched, 1)
        self.assertEqual(result.failed, 0)
        self.assertEqual(reminder.status, Reminder.Status.SENT)
        self.assertEqual(ReminderNotification.objects.filter(reminder=reminder).count(), 1)
        self.assertTrue(any("receiver" in line and "raised" in line for line in logs.output))
        # Not re-fired on the next tick either.
        self.assertEqual(dispatch_due_reminders(now=self.now).dispatched, 0)

    @patch("reminders.services.get_email_service")
    def test_signal_fires_once_per_reminder_even_with_email_retries(self, mock_factory):
        mock_factory.return_value.send_reminder_email.side_effect = [RuntimeError("down"), None]
        Reminder.objects.create(
            user=self.user, title="Once", remind_at=self.now - timedelta(minutes=1),
            channel=Reminder.Channel.EMAIL,
        )
        handler = MagicMock()
        reminder_fired.connect(handler, dispatch_uid="test-once")
        try:
            with self.assertLogs("reminders.services", level="ERROR"):
                dispatch_due_reminders(now=self.now)
            dispatch_due_reminders(now=self.now + timedelta(hours=1))
        finally:
            reminder_fired.disconnect(dispatch_uid="test-once")
        handler.assert_called_once()
        self.assertIsNone(handler.call_args.kwargs["notification"])


@patch("reminders.services.get_email_service")
class EmailRetryTests(TestCase):
    """Bounded, idempotent email retries driven by the regular dispatch tick."""

    def setUp(self):
        self.user = User.objects.create_user(
            email="retry@example.com", password="Password123!", full_name="Retry User"
        )
        self.t0 = timezone.now()

    def _reminder(self, channel=Reminder.Channel.EMAIL, title="Mail"):
        return Reminder.objects.create(
            user=self.user, title=title, remind_at=self.t0 - timedelta(minutes=1), channel=channel
        )

    def test_email_only_failure_is_not_marked_sent(self, mock_factory):
        mock_factory.return_value.send_reminder_email.side_effect = RuntimeError("smtp down")
        reminder = self._reminder()

        with self.assertLogs("reminders.services", level="ERROR"):
            result = dispatch_due_reminders(now=self.t0)

        reminder.refresh_from_db()
        self.assertEqual(result.emails_failed, 1)
        self.assertEqual(reminder.status, Reminder.Status.SCHEDULED)
        self.assertIsNone(reminder.sent_at)
        self.assertEqual(reminder.email_attempts, 1)
        self.assertEqual(reminder.next_attempt_at, ANY)
        self.assertEqual(ReminderNotification.objects.count(), 0)

    def test_lease_prevents_retry_before_backoff_elapses(self, mock_factory):
        mock_factory.return_value.send_reminder_email.side_effect = RuntimeError("smtp down")
        reminder = self._reminder()
        with self.assertLogs("reminders.services", level="ERROR"):
            dispatch_due_reminders(now=self.t0)
        reminder.refresh_from_db()

        # A tick 10 seconds later must not touch it...
        again = dispatch_due_reminders(now=self.t0 + timedelta(seconds=10))
        self.assertEqual(again.dispatched, 0)
        self.assertEqual(mock_factory.return_value.send_reminder_email.call_count, 1)

        # ...but once next_attempt_at passes it is retried.
        with self.assertLogs("reminders.services", level="ERROR"):
            later = dispatch_due_reminders(now=reminder.next_attempt_at)
        self.assertEqual(later.dispatched, 1)
        self.assertEqual(mock_factory.return_value.send_reminder_email.call_count, 2)

    def test_successful_retry_marks_reminder_sent(self, mock_factory):
        service = mock_factory.return_value
        service.send_reminder_email.side_effect = [RuntimeError("smtp down"), None]
        reminder = self._reminder()

        with self.assertLogs("reminders.services", level="ERROR"):
            dispatch_due_reminders(now=self.t0)
        reminder.refresh_from_db()
        result = dispatch_due_reminders(now=reminder.next_attempt_at)
        reminder.refresh_from_db()

        self.assertEqual(result.emails_sent, 1)
        self.assertEqual(reminder.status, Reminder.Status.SENT)
        self.assertIsNotNone(reminder.sent_at)
        self.assertIsNotNone(reminder.email_sent_at)
        self.assertIsNone(reminder.next_attempt_at)
        self.assertEqual(reminder.last_error, "")
        self.assertEqual(reminder.email_attempts, 2)
        # Terminal: a later tick does nothing.
        self.assertEqual(dispatch_due_reminders(now=self.t0 + timedelta(days=1)).dispatched, 0)
        self.assertEqual(service.send_reminder_email.call_count, 2)

    def test_both_channel_retry_does_not_duplicate_in_app_notification(self, mock_factory):
        service = mock_factory.return_value
        service.send_reminder_email.side_effect = [RuntimeError("down"), RuntimeError("down"), None]
        reminder = self._reminder(channel=Reminder.Channel.BOTH, title="Both")

        with self.assertLogs("reminders.services", level="ERROR"):
            first = dispatch_due_reminders(now=self.t0)
        self.assertEqual(first.notifications_created, 1)
        reminder.refresh_from_db()
        notified_at = reminder.notification_sent_at
        self.assertIsNotNone(notified_at)

        with self.assertLogs("reminders.services", level="ERROR"):
            second = dispatch_due_reminders(now=reminder.next_attempt_at)
        reminder.refresh_from_db()
        third = dispatch_due_reminders(now=reminder.next_attempt_at)
        reminder.refresh_from_db()

        self.assertEqual(second.notifications_created, 0)
        self.assertEqual(third.notifications_created, 0)
        self.assertEqual(third.emails_sent, 1)
        self.assertEqual(ReminderNotification.objects.filter(reminder=reminder).count(), 1)
        self.assertEqual(reminder.notification_sent_at, notified_at)
        self.assertEqual(reminder.status, Reminder.Status.SENT)
        self.assertEqual(service.send_reminder_email.call_count, 3)

    @override_settings(REMINDER_EMAIL_MAX_ATTEMPTS=3)
    def test_retry_limit_moves_reminder_to_failed(self, mock_factory):
        service = mock_factory.return_value
        service.send_reminder_email.side_effect = RuntimeError("permanently down")
        reminder = self._reminder()

        now = self.t0
        for attempt in range(1, 4):
            with self.assertLogs("reminders.services", level="ERROR"):
                result = dispatch_due_reminders(now=now)
            reminder.refresh_from_db()
            self.assertEqual(reminder.email_attempts, attempt)
            if attempt < 3:
                self.assertEqual(result.emails_failed, 1)
                self.assertEqual(reminder.status, Reminder.Status.SCHEDULED)
                now = reminder.next_attempt_at
            else:
                self.assertEqual(result.emails_exhausted, 1)

        self.assertEqual(reminder.status, Reminder.Status.FAILED)
        self.assertIsNone(reminder.sent_at)
        self.assertIsNone(reminder.next_attempt_at)
        self.assertIn("attempt 3/3", reminder.last_error)
        self.assertIn("permanently down", reminder.last_error)
        # No further attempts, ever.
        self.assertEqual(dispatch_due_reminders(now=now + timedelta(days=30)).dispatched, 0)
        self.assertEqual(service.send_reminder_email.call_count, 3)

    @override_settings(REMINDER_EMAIL_MAX_ATTEMPTS=2)
    def test_claim_gives_up_when_budget_already_spent_by_crashed_worker(self, mock_factory):
        """Simulate a worker that died after taking the final lease."""
        reminder = self._reminder()
        Reminder.objects.filter(pk=reminder.pk).update(
            email_attempts=2, next_attempt_at=self.t0 - timedelta(minutes=1), last_error="boom"
        )
        result = dispatch_due_reminders(now=self.t0)
        reminder.refresh_from_db()
        self.assertEqual(result.emails_exhausted, 1)
        self.assertEqual(reminder.status, Reminder.Status.FAILED)
        self.assertIn("gave up after 2", reminder.last_error)
        mock_factory.return_value.send_reminder_email.assert_not_called()

    def test_backoff_schedule_grows(self, mock_factory):
        self.assertEqual(email_retry_delay(1), timedelta(minutes=1))
        self.assertEqual(email_retry_delay(2), timedelta(minutes=5))
        self.assertEqual(email_retry_delay(3), timedelta(minutes=15))
        self.assertEqual(email_retry_delay(4), timedelta(minutes=60))
        self.assertEqual(email_retry_delay(99), timedelta(minutes=60))

    def test_delivery_result_ignored_if_user_rescheduled_mid_flight(self, mock_factory):
        """Conditional UPDATE: a reminder re-armed while its email was in flight keeps the new schedule."""
        reminder = self._reminder()
        new_time = self.t0 + timedelta(days=1)

        def reschedule_during_send(**kwargs):
            Reminder.objects.filter(pk=reminder.pk).update(
                remind_at=new_time, **Reminder.delivery_reset_values()
            )

        mock_factory.return_value.send_reminder_email.side_effect = reschedule_during_send

        with self.assertLogs("reminders.services", level="WARNING"):
            result = dispatch_due_reminders(now=self.t0)

        reminder.refresh_from_db()
        self.assertEqual(result.emails_sent, 1)
        self.assertEqual(reminder.status, Reminder.Status.SCHEDULED)
        self.assertEqual(reminder.remind_at, new_time)
        self.assertEqual(reminder.email_attempts, 0)
        self.assertIsNone(reminder.email_sent_at)

    def test_email_service_initialisation_failure_is_retried(self, mock_factory):
        mock_factory.side_effect = RuntimeError("no provider configured")
        reminder = self._reminder()
        with self.assertLogs("reminders.services", level="ERROR"):
            result = dispatch_due_reminders(now=self.t0)
        reminder.refresh_from_db()
        self.assertEqual(result.emails_failed, 1)
        self.assertEqual(reminder.status, Reminder.Status.SCHEDULED)
        self.assertIn("email service unavailable", reminder.last_error)
