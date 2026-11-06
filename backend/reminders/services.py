"""
Reminder dispatching.

``dispatch_due_reminders`` is the single entry point used by the Celery Beat
task and by the ``fire_due_reminders`` management command. It runs in two
phases so that slow email calls never happen while database rows are locked:

Phase 1 - claim (one short transaction)
    Lock a batch of due reminders with ``SELECT ... FOR UPDATE SKIP LOCKED``
    so concurrent workers never pick the same row. For each one, create the
    in-app notification if the channel wants one and it has not been created
    yet, and either mark the reminder ``sent`` (no email needed) or take an
    email *lease*: bump ``email_attempts`` and push ``next_attempt_at`` into
    the future so no other tick re-claims it while we are sending.

Phase 2 - deliver (no locks held)
    Send each leased email. Success advances the reminder to ``sent`` with a
    conditional ``UPDATE ... WHERE status='scheduled' AND remind_at=<claimed>``
    so a reminder the user cancelled or rescheduled mid-flight is left alone.
    Failure records ``last_error`` and schedules the next try with a back-off,
    or moves the reminder to ``failed`` once ``REMINDER_EMAIL_MAX_ATTEMPTS``
    is reached. Because the in-app leg is recorded in ``notification_sent_at``
    a retry of a ``both`` reminder never creates a second notification.

``reminder_fired`` is emitted (robustly) after phase 1 commits, so a broken
receiver can neither roll back a notification nor wedge the reminder.
"""

from __future__ import annotations

import logging
from dataclasses import asdict, dataclass, field
from datetime import timedelta

from django.conf import settings
from django.db import transaction
from django.db.models import Q
from django.utils import timezone

from users.services.email_service import get_email_service

from .models import Reminder, ReminderNotification
from .signals import reminder_fired

logger = logging.getLogger(__name__)

DEFAULT_BATCH_SIZE = 200

#: Minutes to wait before retrying a failed email, indexed by the attempt that
#: just failed (1-based); the last value repeats for later attempts.
EMAIL_RETRY_BACKOFF_MINUTES = (1, 5, 15, 60)

#: How long a claimed email is considered "in flight" before another tick may
#: retry it. Only matters if a worker dies between phase 1 and phase 2.
EMAIL_LEASE = timedelta(minutes=5)

#: ``last_error`` is a TextField, but keep provider stack dumps reasonable.
MAX_ERROR_LENGTH = 2000


def email_max_attempts() -> int:
    return max(1, int(getattr(settings, "REMINDER_EMAIL_MAX_ATTEMPTS", 5)))


def email_retry_delay(failed_attempt: int) -> timedelta:
    index = min(max(failed_attempt, 1), len(EMAIL_RETRY_BACKOFF_MINUTES)) - 1
    return timedelta(minutes=EMAIL_RETRY_BACKOFF_MINUTES[index])


@dataclass
class DispatchResult:
    #: Reminders claimed in this run (in-app created and/or email attempted).
    dispatched: int = 0
    #: Reminders whose claim raised unexpectedly (left untouched, retried next tick).
    failed: int = 0
    notifications_created: int = 0
    emails_sent: int = 0
    #: Email attempts that failed but will be retried later.
    emails_failed: int = 0
    #: Reminders moved to ``failed`` because the retry budget is exhausted.
    emails_exhausted: int = 0

    def as_dict(self) -> dict:
        return asdict(self)


@dataclass
class _Claim:
    """What phase 1 decided for a single reminder."""

    reminder: Reminder
    notification: ReminderNotification | None = None
    #: True the first time this reminder is dispatched (drives ``reminder_fired``).
    first_fire: bool = False
    #: True when phase 2 must send an email for it.
    needs_email: bool = False
    errors: list[str] = field(default_factory=list)


def reminder_href(reminder: Reminder) -> str:
    """Route hint for the frontend when the notification is clicked."""
    if reminder.task_id:
        return "/dashboard/tasks"
    if reminder.event_id:
        return "/dashboard/calendar"
    return "/dashboard"


def _due_label(reminder: Reminder) -> str:
    local = timezone.localtime(reminder.remind_at)
    return local.strftime("%b %d, %Y at %I:%M %p").replace(" 0", " ")


def _truncate(text: str) -> str:
    return text if len(text) <= MAX_ERROR_LENGTH else text[: MAX_ERROR_LENGTH - 1] + "…"


# -- Phase 1: claim ------------------------------------------------------------


def due_reminders_queryset(now, user=None):
    """Scheduled reminders that are due and not currently leased by another tick."""
    qs = Reminder.objects.filter(status=Reminder.Status.SCHEDULED, remind_at__lte=now).filter(
        Q(next_attempt_at__isnull=True) | Q(next_attempt_at__lte=now)
    )
    if user is not None:
        qs = qs.filter(user=user)
    return qs


def _claim(reminder: Reminder, now) -> _Claim:
    """
    Advance a *locked* reminder as far as it can go without external I/O.
    Must run inside a transaction holding the row lock.
    """
    claim = _Claim(
        reminder=reminder,
        first_fire=reminder.notification_sent_at is None and reminder.email_attempts == 0,
    )
    update_fields = ["updated_at"]

    if reminder.wants_in_app and reminder.notification_sent_at is None:
        claim.notification = ReminderNotification.objects.create(
            user=reminder.user,
            reminder=reminder,
            title=reminder.title,
            body=reminder.message,
            href=reminder_href(reminder),
        )
        reminder.notification_sent_at = now
        update_fields.append("notification_sent_at")

    email_pending = reminder.wants_email and reminder.email_sent_at is None
    if email_pending and reminder.email_attempts >= email_max_attempts():
        # A previous tick died after taking the final lease; do not try again.
        reminder.status = Reminder.Status.FAILED
        reminder.next_attempt_at = None
        reminder.last_error = _truncate(
            f"email: gave up after {reminder.email_attempts} attempt(s); "
            f"last error: {reminder.last_error or 'unknown'}"
        )
        update_fields += ["status", "next_attempt_at", "last_error"]
    elif email_pending:
        claim.needs_email = True
        reminder.email_attempts += 1
        reminder.next_attempt_at = now + EMAIL_LEASE
        update_fields += ["email_attempts", "next_attempt_at"]
    else:
        reminder.status = Reminder.Status.SENT
        reminder.sent_at = now
        reminder.next_attempt_at = None
        reminder.last_error = ""
        update_fields += ["status", "sent_at", "next_attempt_at", "last_error"]

    reminder.save(update_fields=update_fields)
    return claim


def _claim_due_reminders(now, batch_size: int, result: DispatchResult, user=None) -> list[_Claim]:
    claims: list[_Claim] = []
    with transaction.atomic():
        due = list(
            due_reminders_queryset(now, user=user)
            .select_for_update(skip_locked=True, of=("self",))
            .select_related("user")
            .order_by("remind_at")[:batch_size]
        )
        for reminder in due:
            try:
                with transaction.atomic():
                    claim = _claim(reminder, now)
            except Exception:  # pragma: no cover - defensive; see test_claim_failure_*
                logger.exception("Reminder %s: claim failed", reminder.id)
                result.failed += 1
                continue
            claims.append(claim)
            result.dispatched += 1
            if claim.notification is not None:
                result.notifications_created += 1
            if reminder.status == Reminder.Status.FAILED:
                result.emails_exhausted += 1
    return claims


def _emit_fired(claims: list[_Claim]) -> None:
    """Emit ``reminder_fired`` once per newly fired reminder, tolerating bad receivers."""
    for claim in claims:
        if not claim.first_fire:
            continue
        responses = reminder_fired.send_robust(
            sender=Reminder, reminder=claim.reminder, notification=claim.notification
        )
        for receiver, response in responses:
            if isinstance(response, Exception):
                logger.error(
                    "Reminder %s: reminder_fired receiver %r raised",
                    claim.reminder.id,
                    getattr(receiver, "__qualname__", receiver),
                    exc_info=(type(response), response, response.__traceback__),
                )


# -- Phase 2: deliver ----------------------------------------------------------


def _deliver_email(claim: _Claim, email_service, result: DispatchResult) -> None:
    """Send one leased email and advance the reminder with a conditional update."""
    reminder = claim.reminder
    attempt = reminder.email_attempts
    max_attempts = email_max_attempts()

    try:
        if email_service is None:
            raise RuntimeError("email service unavailable")
        email_service.send_reminder_email(
            to_email=reminder.user.email,
            full_name=reminder.user.full_name,
            title=reminder.title,
            message=reminder.message,
            due_label=_due_label(reminder),
        )
    except Exception as exc:
        logger.exception("Reminder %s: email attempt %s/%s failed", reminder.id, attempt, max_attempts)
        error = _truncate(f"email attempt {attempt}/{max_attempts}: {exc}")
        exhausted = attempt >= max_attempts
        now = timezone.now()
        updates = {"last_error": error, "updated_at": now}
        if exhausted:
            updates.update(status=Reminder.Status.FAILED, next_attempt_at=None)
        else:
            updates.update(next_attempt_at=now + email_retry_delay(attempt))
        # Only touch the row if nobody re-armed/cancelled it since we claimed it.
        Reminder.objects.filter(
            pk=reminder.pk,
            status=Reminder.Status.SCHEDULED,
            remind_at=reminder.remind_at,
            email_attempts=attempt,
        ).update(**updates)
        for key, value in updates.items():
            setattr(reminder, key, value)
        claim.errors.append(error)
        if exhausted:
            result.emails_exhausted += 1
        else:
            result.emails_failed += 1
        return

    now = timezone.now()
    advanced = Reminder.objects.filter(
        pk=reminder.pk,
        status=Reminder.Status.SCHEDULED,
        remind_at=reminder.remind_at,
        email_sent_at__isnull=True,
    ).update(
        email_sent_at=now,
        status=Reminder.Status.SENT,
        sent_at=now,
        next_attempt_at=None,
        last_error="",
        updated_at=now,
    )
    if advanced:
        reminder.email_sent_at = now
        reminder.status = Reminder.Status.SENT
        reminder.sent_at = now
        reminder.next_attempt_at = None
        reminder.last_error = ""
    else:
        # The user cancelled or rescheduled while the email was in flight. The
        # email is out; the new schedule stands.
        logger.warning("Reminder %s: changed during email delivery; state not advanced", reminder.id)
    result.emails_sent += 1


def _deliver_emails(claims: list[_Claim], email_service, result: DispatchResult) -> None:
    pending = [claim for claim in claims if claim.needs_email]
    if not pending:
        return
    if email_service is None:
        try:
            email_service = get_email_service()
        except Exception:
            logger.exception("Reminder dispatch: could not initialise the email service")
            email_service = None
    for claim in pending:
        _deliver_email(claim, email_service, result)


# -- Entry points --------------------------------------------------------------


def dispatch_due_reminders(
    now=None, batch_size: int = DEFAULT_BATCH_SIZE, email_service=None, user=None
) -> DispatchResult:
    """Fire every scheduled reminder whose ``remind_at`` has passed (see module docs)."""
    now = now or timezone.now()
    result = DispatchResult()

    claims = _claim_due_reminders(now, batch_size, result, user=user)
    _emit_fired(claims)
    _deliver_emails(claims, email_service, result)

    if result.dispatched or result.failed:
        logger.info("Reminder dispatch: %s", result.as_dict())
    return result


def fire_reminder(reminder: Reminder, now=None, email_service=None) -> ReminderNotification | None:
    """
    Fire a single reminder immediately, regardless of ``remind_at`` or lease.
    Same two-phase pipeline as the dispatcher; returns the in-app notification
    created in this call (``None`` for email-only reminders or if it already
    existed).
    """
    now = now or timezone.now()
    result = DispatchResult()
    with transaction.atomic():
        locked = Reminder.objects.select_for_update(of=("self",)).select_related("user").get(pk=reminder.pk)
        claim = _claim(locked, now)
    _emit_fired([claim])
    _deliver_emails([claim], email_service, result)
    # Reflect the outcome on the caller's instance.
    for name in (
        "status", "sent_at", "last_error", "notification_sent_at",
        "email_sent_at", "email_attempts", "next_attempt_at",
    ):
        setattr(reminder, name, getattr(locked, name))
    return claim.notification
