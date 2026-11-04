"""
Celery application for ZenFlow.

Run a worker + beat scheduler with:

    celery -A config worker --beat --loglevel=info

The beat schedule lives in ``config.settings.CELERY_BEAT_SCHEDULE``.
"""

from __future__ import annotations

import os

from celery import Celery

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")

app = Celery("zenflow")

# Read every CELERY_* setting from Django settings.
app.config_from_object("django.conf:settings", namespace="CELERY")

# Discover `tasks.py` modules in all installed apps.
app.autodiscover_tasks()
