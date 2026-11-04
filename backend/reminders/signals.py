"""
Domain events emitted by the reminders scheduler.

``reminder_fired`` is sent once per reminder when it is dispatched, with
``sender=Reminder`` and kwargs ``reminder`` and ``notification`` (the created
``ReminderNotification`` or ``None`` for email-only reminders). Other apps can
connect to it to push to websockets, mobile push, etc.
"""

from django.dispatch import Signal

reminder_fired = Signal()
