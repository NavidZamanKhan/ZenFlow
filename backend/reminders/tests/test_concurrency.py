"""
Concurrency guarantees of the dispatcher, exercised with real PostgreSQL
connections (one per thread). ``TransactionTestCase`` is required so each
thread commits independently and ``SELECT ... FOR UPDATE SKIP LOCKED`` is
actually contended.
"""

import threading
from collections import Counter
from datetime import timedelta
from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.db import connection, transaction
from django.test import TransactionTestCase
from django.utils import timezone
from rest_framework.test import APIClient

from reminders.models import Reminder, ReminderNotification
from reminders.services import _claim, dispatch_due_reminders

User = get_user_model()


class ConcurrentDispatchTests(TransactionTestCase):
    WORKERS = 3

    def setUp(self):
        self.user = User.objects.create_user(
            email="concurrent@example.com", password="Password123!", full_name="Concurrent"
        )
        self.now = timezone.now()

    def _run_workers(self, **dispatch_kwargs):
        results, errors = [], []
        barrier = threading.Barrier(self.WORKERS)

        def worker():
            try:
                barrier.wait(timeout=10)
                results.append(dispatch_due_reminders(now=self.now, **dispatch_kwargs))
            except Exception as exc:  # noqa: BLE001 - surfaced via assertion
                errors.append(exc)
            finally:
                connection.close()

        threads = [threading.Thread(target=worker) for _ in range(self.WORKERS)]
        for thread in threads:
            thread.start()
        for thread in threads:
            thread.join(timeout=30)
        self.assertEqual(errors, [])
        return results

    def test_parallel_workers_never_duplicate_in_app_notifications(self):
        total = 60
        for index in range(total):
            Reminder.objects.create(
                user=self.user, title=f"r{index}", remind_at=self.now - timedelta(minutes=1)
            )

        results = self._run_workers(batch_size=40)

        self.assertEqual(sum(r.dispatched for r in results), total)
        self.assertEqual(ReminderNotification.objects.count(), total)
        self.assertEqual(
            ReminderNotification.objects.values("reminder").distinct().count(), total
        )
        self.assertEqual(Reminder.objects.filter(status=Reminder.Status.SCHEDULED).count(), 0)
        self.assertEqual(Reminder.objects.filter(status=Reminder.Status.SENT).count(), total)

    def test_parallel_workers_send_each_email_once_and_outside_any_transaction(self):
        total = 30
        for index in range(total):
            Reminder.objects.create(
                user=self.user,
                title=f"mail-{index}",
                remind_at=self.now - timedelta(minutes=1),
                channel=Reminder.Channel.BOTH,
            )

        sent = Counter()
        in_transaction = []
        lock = threading.Lock()

        def record_send(**kwargs):
            with lock:
                sent[kwargs["title"]] += 1
                in_transaction.append(connection.in_atomic_block)

        with patch("reminders.services.get_email_service") as factory:
            factory.return_value.send_reminder_email.side_effect = record_send
            results = self._run_workers(batch_size=20)

        self.assertEqual(sum(r.dispatched for r in results), total)
        self.assertEqual(sum(r.emails_sent for r in results), total)
        self.assertEqual(sum(sent.values()), total)
        self.assertEqual(max(sent.values()), 1, f"duplicate emails: {sent}")
        # Email I/O happens after the claim transaction committed.
        self.assertTrue(in_transaction, "no emails were sent")
        self.assertFalse(any(in_transaction), "email was sent while inside a transaction")
        self.assertEqual(ReminderNotification.objects.count(), total)
        self.assertEqual(Reminder.objects.filter(status=Reminder.Status.SENT).count(), total)
        self.assertEqual(Reminder.objects.filter(email_sent_at__isnull=True).count(), 0)

    def test_api_edit_racing_the_dispatcher_cannot_undo_a_fire(self):
        """
        Lost-update guard: a PATCH that starts while the dispatcher holds the
        row must observe the committed fire, not overwrite it with stale state.
        """
        reminder = Reminder.objects.create(
            user=self.user, title="Racy", remind_at=self.now - timedelta(minutes=1)
        )
        claimed = threading.Event()
        release = threading.Event()

        def dispatcher_holding_lock():
            try:
                with transaction.atomic():
                    locked = Reminder.objects.select_for_update().select_related("user").get(pk=reminder.pk)
                    _claim(locked, self.now)
                    claimed.set()
                    release.wait(timeout=10)
            finally:
                connection.close()

        patch_result = {}

        def api_edit():
            try:
                client = APIClient()
                client.force_authenticate(user=self.user)
                response = client.patch(f"/api/reminders/{reminder.id}/", {"title": "Renamed"}, format="json")
                patch_result["status_code"] = response.status_code
                patch_result["data"] = response.data
            finally:
                connection.close()

        dispatcher = threading.Thread(target=dispatcher_holding_lock)
        dispatcher.start()
        self.assertTrue(claimed.wait(timeout=10))

        editor = threading.Thread(target=api_edit)
        editor.start()
        editor.join(timeout=1.0)  # the write must block on the row lock
        release.set()
        dispatcher.join(timeout=10)
        editor.join(timeout=10)

        reminder.refresh_from_db()
        self.assertEqual(patch_result.get("status_code"), 200)
        self.assertEqual(reminder.title, "Renamed")
        self.assertEqual(reminder.status, Reminder.Status.SENT, "PATCH overwrote the committed fire")
        self.assertIsNotNone(reminder.notification_sent_at)
        self.assertEqual(patch_result["data"]["status"], "sent")
        # And the next tick must not fire it again.
        self.assertEqual(dispatch_due_reminders(now=self.now + timedelta(minutes=1)).dispatched, 0)
        self.assertEqual(ReminderNotification.objects.filter(reminder=reminder).count(), 1)

    def test_retry_of_failed_emails_is_not_claimed_twice(self):
        """Two overlapping ticks after a failure: only one may take the retry lease."""
        reminder = Reminder.objects.create(
            user=self.user,
            title="retry-me",
            remind_at=self.now - timedelta(minutes=1),
            channel=Reminder.Channel.EMAIL,
        )
        Reminder.objects.filter(pk=reminder.pk).update(
            email_attempts=1, next_attempt_at=self.now - timedelta(seconds=1), last_error="x"
        )

        sent = Counter()
        lock = threading.Lock()

        def record_send(**kwargs):
            with lock:
                sent[kwargs["title"]] += 1

        with patch("reminders.services.get_email_service") as factory:
            factory.return_value.send_reminder_email.side_effect = record_send
            results = self._run_workers()

        reminder.refresh_from_db()
        self.assertEqual(sum(r.dispatched for r in results), 1)
        self.assertEqual(sent["retry-me"], 1)
        self.assertEqual(reminder.status, Reminder.Status.SENT)
        self.assertEqual(reminder.email_attempts, 2)
