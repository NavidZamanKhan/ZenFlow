import uuid

from django.conf import settings
from django.db import models


class Reminder(models.Model):
    """
    A user-scheduled reminder. The scheduler (Celery Beat or the
    ``fire_due_reminders`` management command) fires every reminder whose
    ``remind_at`` has passed, producing a ``ReminderNotification`` and/or an
    email, then marks it as sent.

    Delivery state machine
    ----------------------
    ``scheduled`` -> ``sent``        in-app notification created and (if the
                                     channel includes email) the email accepted
                                     by the provider.
    ``scheduled`` -> ``scheduled``   email attempt failed; ``email_attempts`` is
                                     incremented and ``next_attempt_at`` holds
                                     the back-off deadline for the next try.
    ``scheduled`` -> ``failed``      email still failing after
                                     ``REMINDER_EMAIL_MAX_ATTEMPTS`` tries.
    any           -> ``cancelled``   by the user.
    ``sent``/``failed`` -> ``scheduled``  re-armed by the user (reschedule or
                                     snooze); every delivery field is reset so
                                     the reminder behaves like a new one.

    ``notification_sent_at`` / ``email_sent_at`` record which legs of a
    ``both`` reminder already completed so retries never duplicate them.
    """

    class Channel(models.TextChoices):
        IN_APP = 'in_app', 'In-app'
        EMAIL = 'email', 'Email'
        BOTH = 'both', 'In-app and email'

    class Status(models.TextChoices):
        SCHEDULED = 'scheduled', 'Scheduled'
        SENT = 'sent', 'Sent'
        CANCELLED = 'cancelled', 'Cancelled'
        FAILED = 'failed', 'Failed'

    #: Statuses the scheduler owns; clients may not set them directly.
    SCHEDULER_MANAGED_STATUSES = (Status.SENT, Status.FAILED)

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='reminders',
    )
    title = models.CharField(max_length=255)
    message = models.TextField(blank=True)
    remind_at = models.DateTimeField()
    channel = models.CharField(
        max_length=10,
        choices=Channel.choices,
        default=Channel.IN_APP,
    )
    status = models.CharField(
        max_length=10,
        choices=Status.choices,
        default=Status.SCHEDULED,
    )
    sent_at = models.DateTimeField(null=True, blank=True)
    last_error = models.TextField(blank=True)
    # Per-leg delivery bookkeeping (see class docstring).
    notification_sent_at = models.DateTimeField(null=True, blank=True)
    email_sent_at = models.DateTimeField(null=True, blank=True)
    email_attempts = models.PositiveSmallIntegerField(default=0)
    next_attempt_at = models.DateTimeField(null=True, blank=True)
    task = models.ForeignKey(
        'tasks.Task',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='reminders',
    )
    event = models.ForeignKey(
        'events.Event',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='reminders',
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['remind_at', 'created_at']
        indexes = [
            models.Index(fields=['user', 'status', 'remind_at']),
            models.Index(fields=['status', 'remind_at']),
        ]

    def __str__(self):
        return f"{self.title} @ {self.remind_at:%Y-%m-%d %H:%M}"

    @property
    def is_due(self) -> bool:
        from django.utils import timezone

        return self.status == self.Status.SCHEDULED and self.remind_at <= timezone.now()

    @property
    def wants_in_app(self) -> bool:
        return self.channel in (self.Channel.IN_APP, self.Channel.BOTH)

    @property
    def wants_email(self) -> bool:
        return self.channel in (self.Channel.EMAIL, self.Channel.BOTH)

    @classmethod
    def delivery_reset_values(cls) -> dict:
        """
        Field values that turn a reminder back into a pristine, scheduled one.
        Applied whenever a reminder is re-armed (rescheduled, snoozed, or set
        back to ``scheduled``) so a retry never sees stale delivery state.
        """
        return {
            'status': cls.Status.SCHEDULED,
            'sent_at': None,
            'last_error': '',
            'notification_sent_at': None,
            'email_sent_at': None,
            'email_attempts': 0,
            'next_attempt_at': None,
        }

    def reset_delivery_state(self) -> list[str]:
        """Apply :meth:`delivery_reset_values` to ``self``; returns the touched field names."""
        values = self.delivery_reset_values()
        for name, value in values.items():
            setattr(self, name, value)
        return list(values)


class ReminderNotification(models.Model):
    """
    An in-app notification produced when a reminder fires. Surfaced by the
    frontend notification bell; read state is persisted server-side.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='reminder_notifications',
    )
    reminder = models.ForeignKey(
        Reminder,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='notifications',
    )
    title = models.CharField(max_length=255)
    body = models.TextField(blank=True)
    href = models.CharField(max_length=255, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    read_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user', 'read_at', '-created_at']),
        ]

    def __str__(self):
        return self.title

    @property
    def is_read(self) -> bool:
        return self.read_at is not None
