from datetime import timedelta

from django.contrib.auth import get_user_model
from django.test import TestCase
from django.utils import timezone

from reminders.models import Reminder, ReminderNotification
from tasks.models import Task

User = get_user_model()


class ReminderModelTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            email="reminder@example.com", password="Password123!", full_name="Reminder User"
        )

    def test_defaults(self):
        reminder = Reminder.objects.create(
            user=self.user, title="Water the plants", remind_at=timezone.now() + timedelta(hours=1)
        )
        self.assertEqual(reminder.channel, Reminder.Channel.IN_APP)
        self.assertEqual(reminder.status, Reminder.Status.SCHEDULED)
        self.assertIsNone(reminder.sent_at)
        self.assertEqual(reminder.last_error, "")
        self.assertFalse(reminder.is_due)

    def test_is_due_when_remind_at_has_passed(self):
        reminder = Reminder.objects.create(
            user=self.user, title="Past", remind_at=timezone.now() - timedelta(minutes=1)
        )
        self.assertTrue(reminder.is_due)
        reminder.status = Reminder.Status.SENT
        self.assertFalse(reminder.is_due)

    def test_ordering_is_by_remind_at(self):
        later = Reminder.objects.create(
            user=self.user, title="Later", remind_at=timezone.now() + timedelta(days=2)
        )
        sooner = Reminder.objects.create(
            user=self.user, title="Sooner", remind_at=timezone.now() + timedelta(days=1)
        )
        self.assertEqual(list(Reminder.objects.all()), [sooner, later])

    def test_deleting_linked_task_keeps_reminder(self):
        task = Task.objects.create(user=self.user, title="Linked task")
        reminder = Reminder.objects.create(
            user=self.user, title="Task reminder", remind_at=timezone.now(), task=task
        )
        task.delete()
        reminder.refresh_from_db()
        self.assertIsNone(reminder.task)

    def test_user_cascade_deletes_reminders_and_notifications(self):
        reminder = Reminder.objects.create(user=self.user, title="X", remind_at=timezone.now())
        ReminderNotification.objects.create(user=self.user, reminder=reminder, title="X")
        self.user.delete()
        self.assertEqual(Reminder.objects.count(), 0)
        self.assertEqual(ReminderNotification.objects.count(), 0)

    def test_reset_delivery_state_restores_pristine_scheduled_reminder(self):
        reminder = Reminder.objects.create(
            user=self.user,
            title="Partially delivered",
            remind_at=timezone.now() - timedelta(minutes=5),
            channel=Reminder.Channel.BOTH,
            status=Reminder.Status.FAILED,
            sent_at=timezone.now(),
            last_error="email attempt 5/5: down",
            notification_sent_at=timezone.now(),
            email_sent_at=None,
            email_attempts=5,
            next_attempt_at=timezone.now(),
        )
        touched = reminder.reset_delivery_state()
        reminder.save(update_fields=touched)
        reminder.refresh_from_db()
        self.assertEqual(reminder.status, Reminder.Status.SCHEDULED)
        self.assertIsNone(reminder.sent_at)
        self.assertEqual(reminder.last_error, "")
        self.assertIsNone(reminder.notification_sent_at)
        self.assertIsNone(reminder.email_sent_at)
        self.assertEqual(reminder.email_attempts, 0)
        self.assertIsNone(reminder.next_attempt_at)
        self.assertTrue(reminder.wants_in_app)
        self.assertTrue(reminder.wants_email)

    def test_notification_read_state(self):
        notification = ReminderNotification.objects.create(user=self.user, title="Hello")
        self.assertFalse(notification.is_read)
        notification.read_at = timezone.now()
        self.assertTrue(notification.is_read)
        self.assertEqual(str(notification), "Hello")
