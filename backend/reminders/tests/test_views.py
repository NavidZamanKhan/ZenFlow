from datetime import timedelta
from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APIClient, APITestCase

from events.models import Event
from reminders.models import Reminder, ReminderNotification
from tasks.models import Task

User = get_user_model()

REMINDERS_URL = "/api/reminders/"
NOTIFICATIONS_URL = "/api/reminders/notifications/"


class ReminderViewSetTests(APITestCase):
    def setUp(self):
        self.client = APIClient()
        self.user_a = User.objects.create_user(
            email="usera@example.com", password="Password123!", full_name="User A"
        )
        self.user_b = User.objects.create_user(
            email="userb@example.com", password="Password123!", full_name="User B"
        )
        self.client.force_authenticate(user=self.user_a)
        self.future = (timezone.now() + timedelta(hours=2)).replace(microsecond=0)

    def test_create_reminder_camelcase_contract(self):
        payload = {
            "title": "  Call the bank  ",
            "message": "Ask about the card",
            "remindAt": self.future.isoformat(),
            "channel": "both",
        }
        response = self.client.post(REMINDERS_URL, payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["title"], "Call the bank")
        self.assertEqual(response.data["channel"], "both")
        self.assertEqual(response.data["status"], "scheduled")
        self.assertIsNone(response.data["sentAt"])
        self.assertIsNone(response.data["taskId"])
        self.assertIn("createdAt", response.data)

        reminder = Reminder.objects.get(id=response.data["id"])
        self.assertEqual(reminder.user, self.user_a)
        self.assertEqual(reminder.remind_at, self.future)

    def test_create_requires_title_and_remind_at(self):
        response = self.client.post(REMINDERS_URL, {"title": "   "}, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("title", response.data)
        self.assertIn("remindAt", response.data)

    def test_cannot_set_status_sent_from_client(self):
        response = self.client.post(
            REMINDERS_URL,
            {"title": "Nope", "remindAt": self.future.isoformat(), "status": "sent"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("status", response.data)

    def test_link_to_own_task_allowed_but_not_other_users(self):
        own_task = Task.objects.create(user=self.user_a, title="Mine")
        other_task = Task.objects.create(user=self.user_b, title="Theirs")

        ok = self.client.post(
            REMINDERS_URL,
            {"title": "Own", "remindAt": self.future.isoformat(), "taskId": str(own_task.id)},
            format="json",
        )
        self.assertEqual(ok.status_code, status.HTTP_201_CREATED)
        self.assertEqual(ok.data["taskId"], str(own_task.id))

        forbidden = self.client.post(
            REMINDERS_URL,
            {"title": "Theirs", "remindAt": self.future.isoformat(), "taskId": str(other_task.id)},
            format="json",
        )
        self.assertEqual(forbidden.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("taskId", forbidden.data)

    def test_link_to_own_event(self):
        event = Event.objects.create(
            user=self.user_a,
            title="Standup",
            start_datetime=self.future,
            end_datetime=self.future + timedelta(hours=1),
        )
        response = self.client.post(
            REMINDERS_URL,
            {"title": "Standup soon", "remindAt": self.future.isoformat(), "eventId": event.id},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["eventId"], event.id)

    def test_list_only_returns_own_reminders_with_filters(self):
        Reminder.objects.create(user=self.user_a, title="A1", remind_at=self.future)
        Reminder.objects.create(
            user=self.user_a, title="A-sent", remind_at=self.future, status=Reminder.Status.SENT
        )
        Reminder.objects.create(
            user=self.user_a, title="A-past", remind_at=timezone.now() - timedelta(days=1)
        )
        Reminder.objects.create(user=self.user_b, title="B1", remind_at=self.future)

        all_response = self.client.get(REMINDERS_URL)
        self.assertEqual(all_response.status_code, status.HTTP_200_OK)
        self.assertEqual({r["title"] for r in all_response.data}, {"A1", "A-sent", "A-past"})

        sent_only = self.client.get(REMINDERS_URL, {"status": "sent"})
        self.assertEqual([r["title"] for r in sent_only.data], ["A-sent"])

        upcoming = self.client.get(REMINDERS_URL, {"upcoming": "1"})
        self.assertEqual([r["title"] for r in upcoming.data], ["A1"])

    def test_update_and_delete(self):
        reminder = Reminder.objects.create(user=self.user_a, title="Old", remind_at=self.future)
        patch = self.client.patch(
            f"{REMINDERS_URL}{reminder.id}/", {"title": "New", "status": "cancelled"}, format="json"
        )
        self.assertEqual(patch.status_code, status.HTTP_200_OK)
        self.assertEqual(patch.data["title"], "New")
        self.assertEqual(patch.data["status"], "cancelled")

        delete = self.client.delete(f"{REMINDERS_URL}{reminder.id}/")
        self.assertEqual(delete.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(Reminder.objects.filter(id=reminder.id).exists())

    def test_rescheduling_a_sent_reminder_rearms_it(self):
        reminder = Reminder.objects.create(
            user=self.user_a,
            title="Sent",
            remind_at=timezone.now() - timedelta(hours=1),
            status=Reminder.Status.SENT,
            sent_at=timezone.now(),
        )
        response = self.client.patch(
            f"{REMINDERS_URL}{reminder.id}/", {"remindAt": self.future.isoformat()}, format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["status"], "scheduled")
        self.assertIsNone(response.data["sentAt"])

    def test_cross_user_access_returns_404(self):
        reminder = Reminder.objects.create(user=self.user_b, title="B", remind_at=self.future)
        self.assertEqual(
            self.client.get(f"{REMINDERS_URL}{reminder.id}/").status_code, status.HTTP_404_NOT_FOUND
        )
        self.assertEqual(
            self.client.delete(f"{REMINDERS_URL}{reminder.id}/").status_code, status.HTTP_404_NOT_FOUND
        )

    def test_snooze_pushes_remind_at_forward_and_rearms(self):
        reminder = Reminder.objects.create(
            user=self.user_a,
            title="Snooze me",
            remind_at=timezone.now() - timedelta(minutes=5),
            status=Reminder.Status.SENT,
            sent_at=timezone.now(),
        )
        before = timezone.now()
        response = self.client.post(f"{REMINDERS_URL}{reminder.id}/snooze/", {"minutes": 15}, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["status"], "scheduled")

        reminder.refresh_from_db()
        self.assertIsNone(reminder.sent_at)
        self.assertGreaterEqual(reminder.remind_at, before + timedelta(minutes=15))

    def test_snooze_rejects_invalid_minutes(self):
        reminder = Reminder.objects.create(user=self.user_a, title="X", remind_at=self.future)
        response = self.client.post(f"{REMINDERS_URL}{reminder.id}/snooze/", {"minutes": 0}, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        too_long = self.client.post(
            f"{REMINDERS_URL}{reminder.id}/snooze/", {"minutes": 60 * 24 * 30 + 1}, format="json"
        )
        self.assertEqual(too_long.status_code, status.HTTP_400_BAD_REQUEST)

    def test_snooze_rejects_cancelled_reminder(self):
        reminder = Reminder.objects.create(
            user=self.user_a, title="Cancelled", remind_at=self.future, status=Reminder.Status.CANCELLED
        )
        response = self.client.post(f"{REMINDERS_URL}{reminder.id}/snooze/", {"minutes": 10}, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("detail", response.data)
        reminder.refresh_from_db()
        self.assertEqual(reminder.status, Reminder.Status.CANCELLED)
        self.assertEqual(reminder.remind_at, self.future)

    def test_snooze_resets_delivery_state(self):
        """A snoozed `both` reminder notifies again at the new time, from a clean slate."""
        reminder = Reminder.objects.create(
            user=self.user_a,
            title="Partially delivered",
            remind_at=timezone.now() - timedelta(minutes=5),
            channel=Reminder.Channel.BOTH,
            notification_sent_at=timezone.now(),
            email_attempts=2,
            next_attempt_at=timezone.now() + timedelta(minutes=5),
            last_error="email attempt 2/5: smtp down",
        )
        response = self.client.post(f"{REMINDERS_URL}{reminder.id}/snooze/", {"minutes": 30}, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["emailAttempts"], 0)
        self.assertIsNone(response.data["nextAttemptAt"])
        self.assertEqual(response.data["lastError"], "")
        reminder.refresh_from_db()
        self.assertIsNone(reminder.notification_sent_at)
        self.assertIsNone(reminder.email_sent_at)

    def test_snooze_rearms_failed_reminder(self):
        reminder = Reminder.objects.create(
            user=self.user_a,
            title="Failed",
            remind_at=timezone.now() - timedelta(hours=1),
            channel=Reminder.Channel.EMAIL,
            status=Reminder.Status.FAILED,
            email_attempts=5,
            last_error="email attempt 5/5: down",
        )
        response = self.client.post(f"{REMINDERS_URL}{reminder.id}/snooze/", {"minutes": 10}, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["status"], "scheduled")
        self.assertEqual(response.data["emailAttempts"], 0)

    def test_setting_status_scheduled_on_sent_reminder_clears_sent_at(self):
        reminder = Reminder.objects.create(
            user=self.user_a,
            title="Sent",
            remind_at=timezone.now() - timedelta(hours=1),
            status=Reminder.Status.SENT,
            sent_at=timezone.now(),
            notification_sent_at=timezone.now(),
        )
        response = self.client.patch(
            f"{REMINDERS_URL}{reminder.id}/", {"status": "scheduled"}, format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["status"], "scheduled")
        self.assertIsNone(response.data["sentAt"])
        reminder.refresh_from_db()
        self.assertIsNone(reminder.sent_at)
        self.assertIsNone(reminder.notification_sent_at)

    def test_rescheduling_failed_reminder_rearms_it(self):
        reminder = Reminder.objects.create(
            user=self.user_a,
            title="Failed",
            remind_at=timezone.now() - timedelta(hours=1),
            channel=Reminder.Channel.EMAIL,
            status=Reminder.Status.FAILED,
            email_attempts=5,
            last_error="email attempt 5/5: down",
        )
        response = self.client.patch(
            f"{REMINDERS_URL}{reminder.id}/", {"remindAt": self.future.isoformat()}, format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["status"], "scheduled")
        self.assertEqual(response.data["emailAttempts"], 0)
        self.assertEqual(response.data["lastError"], "")

    def test_rescheduling_a_scheduled_reminder_resets_partial_delivery(self):
        reminder = Reminder.objects.create(
            user=self.user_a,
            title="Mid retry",
            remind_at=timezone.now() - timedelta(minutes=5),
            channel=Reminder.Channel.BOTH,
            notification_sent_at=timezone.now(),
            email_attempts=1,
            next_attempt_at=timezone.now() + timedelta(minutes=1),
        )
        response = self.client.patch(
            f"{REMINDERS_URL}{reminder.id}/", {"remindAt": self.future.isoformat()}, format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        reminder.refresh_from_db()
        self.assertIsNone(reminder.notification_sent_at)
        self.assertEqual(reminder.email_attempts, 0)
        self.assertIsNone(reminder.next_attempt_at)

    def test_editing_title_does_not_touch_delivery_state(self):
        notified = timezone.now()
        reminder = Reminder.objects.create(
            user=self.user_a,
            title="Old",
            remind_at=timezone.now() - timedelta(minutes=5),
            channel=Reminder.Channel.BOTH,
            notification_sent_at=notified,
            email_attempts=1,
        )
        response = self.client.patch(f"{REMINDERS_URL}{reminder.id}/", {"title": "New"}, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        reminder.refresh_from_db()
        self.assertEqual(reminder.notification_sent_at, notified)
        self.assertEqual(reminder.email_attempts, 1)

    def test_rescheduling_cancelled_reminder_keeps_it_cancelled(self):
        reminder = Reminder.objects.create(
            user=self.user_a, title="C", remind_at=self.future, status=Reminder.Status.CANCELLED
        )
        response = self.client.patch(
            f"{REMINDERS_URL}{reminder.id}/",
            {"remindAt": (self.future + timedelta(days=1)).isoformat()},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["status"], "cancelled")

    def test_cannot_set_status_failed_from_client(self):
        reminder = Reminder.objects.create(user=self.user_a, title="X", remind_at=self.future)
        response = self.client.patch(f"{REMINDERS_URL}{reminder.id}/", {"status": "failed"}, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("status", response.data)

    def test_remind_at_with_utc_offset_is_stored_as_the_same_instant(self):
        response = self.client.post(
            REMINDERS_URL,
            {"title": "Dhaka 10am", "remindAt": "2030-01-01T10:00:00+06:00"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        reminder = Reminder.objects.get(id=response.data["id"])
        self.assertEqual(reminder.remind_at.isoformat(), "2030-01-01T04:00:00+00:00")
        self.assertEqual(response.data["remindAt"], "2030-01-01T04:00:00Z")

    def test_status_filter_accepts_failed(self):
        Reminder.objects.create(
            user=self.user_a, title="F", remind_at=self.future, status=Reminder.Status.FAILED
        )
        Reminder.objects.create(user=self.user_a, title="S", remind_at=self.future)
        response = self.client.get(REMINDERS_URL, {"status": "failed"})
        self.assertEqual([r["title"] for r in response.data], ["F"])

    def test_unauthenticated_returns_401(self):
        response = APIClient().get(REMINDERS_URL)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)


class ReminderNotificationViewSetTests(APITestCase):
    def setUp(self):
        self.client = APIClient()
        self.user_a = User.objects.create_user(
            email="usera@example.com", password="Password123!", full_name="User A"
        )
        self.user_b = User.objects.create_user(
            email="userb@example.com", password="Password123!", full_name="User B"
        )
        self.client.force_authenticate(user=self.user_a)
        self.n1 = ReminderNotification.objects.create(user=self.user_a, title="One", href="/dashboard/tasks")
        self.n2 = ReminderNotification.objects.create(
            user=self.user_a, title="Two", read_at=timezone.now()
        )
        ReminderNotification.objects.create(user=self.user_b, title="Other")

    def test_list_returns_own_notifications_newest_first(self):
        response = self.client.get(NOTIFICATIONS_URL)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual([n["title"] for n in response.data], ["Two", "One"])
        self.assertFalse(response.data[1]["read"])
        self.assertTrue(response.data[0]["read"])
        self.assertEqual(response.data[1]["href"], "/dashboard/tasks")

    def test_unread_filter(self):
        response = self.client.get(NOTIFICATIONS_URL, {"unread": "1"})
        self.assertEqual([n["title"] for n in response.data], ["One"])

    def test_mark_read_and_read_all(self):
        read = self.client.post(f"{NOTIFICATIONS_URL}{self.n1.id}/read/")
        self.assertEqual(read.status_code, status.HTTP_200_OK)
        self.assertTrue(read.data["read"])
        self.n1.refresh_from_db()
        self.assertIsNotNone(self.n1.read_at)

        ReminderNotification.objects.create(user=self.user_a, title="Three")
        read_all = self.client.post(f"{NOTIFICATIONS_URL}read-all/")
        self.assertEqual(read_all.status_code, status.HTTP_200_OK)
        self.assertEqual(read_all.data["updated"], 1)
        self.assertEqual(
            ReminderNotification.objects.filter(user=self.user_a, read_at__isnull=True).count(), 0
        )
        # Other user's notification is untouched
        self.assertEqual(
            ReminderNotification.objects.filter(user=self.user_b, read_at__isnull=True).count(), 1
        )

    def test_delete_and_cross_user_isolation(self):
        other = ReminderNotification.objects.get(user=self.user_b)
        self.assertEqual(
            self.client.post(f"{NOTIFICATIONS_URL}{other.id}/read/").status_code,
            status.HTTP_404_NOT_FOUND,
        )
        delete = self.client.delete(f"{NOTIFICATIONS_URL}{self.n2.id}/")
        self.assertEqual(delete.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(ReminderNotification.objects.filter(id=self.n2.id).exists())

    def test_unauthenticated_returns_401(self):
        self.assertEqual(APIClient().get(NOTIFICATIONS_URL).status_code, status.HTTP_401_UNAUTHORIZED)

    def test_notifications_list_dispatches_due_reminders_for_authenticated_user(self):
        past = timezone.now() - timedelta(minutes=5)
        reminder_a = Reminder.objects.create(
            user=self.user_a,
            title="Due for A",
            remind_at=past,
            channel=Reminder.Channel.IN_APP,
        )
        reminder_b = Reminder.objects.create(
            user=self.user_b,
            title="Due for B",
            remind_at=past,
            channel=Reminder.Channel.IN_APP,
        )

        response = self.client.get(NOTIFICATIONS_URL)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        reminder_a.refresh_from_db()
        reminder_b.refresh_from_db()
        self.assertEqual(reminder_a.status, Reminder.Status.SENT)
        self.assertEqual(reminder_b.status, Reminder.Status.SCHEDULED)

        titles = [n["title"] for n in response.data]
        self.assertIn("Due for A", titles)
        self.assertNotIn("Due for B", titles)

    @patch("reminders.services.get_email_service")
    def test_notifications_list_dispatches_due_both_reminder_and_sends_email(self, mock_factory):
        mock_service = mock_factory.return_value
        past = timezone.now() - timedelta(minutes=5)
        reminder = Reminder.objects.create(
            user=self.user_a,
            title="Both Due for A",
            remind_at=past,
            channel=Reminder.Channel.BOTH,
        )

        response = self.client.get(NOTIFICATIONS_URL)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        reminder.refresh_from_db()
        self.assertEqual(reminder.status, Reminder.Status.SENT)
        mock_service.send_reminder_email.assert_called_once()
        titles = [n["title"] for n in response.data]
        self.assertIn("Both Due for A", titles)

    @patch("reminders.views.dispatch_due_reminders", side_effect=RuntimeError("dispatch error"))
    def test_notifications_list_gracefully_handles_dispatch_error(self, mock_dispatch):
        response = self.client.get(NOTIFICATIONS_URL)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_notifications_list_does_not_dispatch_future_reminders(self):
        future = timezone.now() + timedelta(hours=1)
        reminder = Reminder.objects.create(
            user=self.user_a,
            title="Future Reminder",
            remind_at=future,
            channel=Reminder.Channel.BOTH,
        )

        response = self.client.get(NOTIFICATIONS_URL)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        reminder.refresh_from_db()
        self.assertEqual(reminder.status, Reminder.Status.SCHEDULED)
        titles = [n["title"] for n in response.data]
        self.assertNotIn("Future Reminder", titles)
