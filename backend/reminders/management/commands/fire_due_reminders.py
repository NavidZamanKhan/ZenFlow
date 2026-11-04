"""
Fire every due reminder once. Intended for hosts without a Celery broker:
point a cron job (or a Render/Railway cron service) at

    python manage.py fire_due_reminders

every minute. Functionally identical to the Celery Beat task.
"""

from django.core.management.base import BaseCommand

from reminders.services import DEFAULT_BATCH_SIZE, dispatch_due_reminders


class Command(BaseCommand):
    help = "Dispatch all scheduled reminders whose remind_at has passed."

    def add_arguments(self, parser):
        parser.add_argument(
            "--batch-size",
            type=int,
            default=DEFAULT_BATCH_SIZE,
            help="Maximum reminders to fire in this run.",
        )

    def handle(self, *args, **options):
        result = dispatch_due_reminders(batch_size=options["batch_size"])
        self.stdout.write(
            self.style.SUCCESS(
                "Dispatched {dispatched} reminder(s) "
                "({notifications_created} notification(s), {emails_sent} email(s), {failed} failed).".format(
                    **result.as_dict()
                )
            )
        )
