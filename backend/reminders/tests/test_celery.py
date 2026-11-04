from django.conf import settings
from django.test import SimpleTestCase

from config.celery import app
from reminders.tasks import dispatch_due_reminders

BEAT_ENTRY = "dispatch-due-reminders"


class CeleryBeatRegistrationTests(SimpleTestCase):
    def test_beat_schedule_points_at_a_registered_task(self):
        app.loader.import_default_modules()
        entry = app.conf.beat_schedule[BEAT_ENTRY]
        self.assertEqual(entry["task"], dispatch_due_reminders.name)
        self.assertIn(entry["task"], app.tasks)
        # `shared_task` hands back a proxy, so compare the registered task's
        # identity by name and underlying implementation rather than `is`.
        registered = app.tasks[entry["task"]]
        self.assertEqual(registered.name, entry["task"])
        self.assertIs(registered.run, dispatch_due_reminders.run)

    def test_beat_schedule_matches_settings_and_expires_before_next_tick(self):
        entry = app.conf.beat_schedule[BEAT_ENTRY]
        interval = settings.REMINDER_DISPATCH_INTERVAL_SECONDS
        self.assertEqual(entry["schedule"], interval)
        self.assertGreater(interval, 0)
        self.assertLess(entry["options"]["expires"], interval)
        self.assertGreater(entry["options"]["expires"], 0)

    def test_task_configuration(self):
        self.assertTrue(dispatch_due_reminders.ignore_result)
        self.assertTrue(app.conf.task_acks_late)
        self.assertEqual(app.conf.task_serializer, "json")
        self.assertEqual(app.conf.accept_content, ["json"])
