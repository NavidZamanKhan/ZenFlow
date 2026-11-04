"""
Celery tasks for the reminders app. Scheduled by Celery Beat (see
``CELERY_BEAT_SCHEDULE`` in settings) to run every minute.
"""

from celery import shared_task

from .services import dispatch_due_reminders as _dispatch


@shared_task(name="reminders.tasks.dispatch_due_reminders", ignore_result=True)
def dispatch_due_reminders() -> dict:
    return _dispatch().as_dict()
