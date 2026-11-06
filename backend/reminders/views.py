from datetime import timedelta
import logging

from django.db import transaction
from django.utils import timezone
from rest_framework import mixins, permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from .models import Reminder, ReminderNotification
from .serializers import (
    ReminderNotificationSerializer,
    ReminderSerializer,
    ReminderSnoozeSerializer,
)
from .services import dispatch_due_reminders

logger = logging.getLogger(__name__)


class ReminderViewSet(viewsets.ModelViewSet):
    """
    CRUD for the authenticated user's reminders.

    Filters: ``?status=scheduled|sent|cancelled`` and ``?upcoming=1`` (only
    scheduled reminders from now on, soonest first).
    """

    serializer_class = ReminderSerializer
    permission_classes = [permissions.IsAuthenticated]

    #: Actions that write the row. They lock it (inside ``transaction.atomic``)
    #: so an edit racing the dispatcher sees the committed fire instead of
    #: overwriting it with stale state via ``instance.save()``.
    LOCKING_ACTIONS = ('update', 'partial_update', 'snooze')

    def get_queryset(self):
        queryset = Reminder.objects.filter(user=self.request.user)
        if self.action in self.LOCKING_ACTIONS:
            queryset = queryset.select_for_update()
        status_param = self.request.query_params.get('status')
        if status_param in Reminder.Status.values:
            queryset = queryset.filter(status=status_param)
        if self.request.query_params.get('upcoming') in ('1', 'true'):
            queryset = queryset.filter(
                status=Reminder.Status.SCHEDULED,
                remind_at__gte=timezone.now(),
            )
        return queryset

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    @transaction.atomic
    def update(self, request, *args, **kwargs):
        return super().update(request, *args, **kwargs)

    @transaction.atomic
    @action(detail=True, methods=['post'])
    def snooze(self, request, pk=None):
        """
        Push the reminder forward by ``minutes`` (default 10) and re-arm it.

        Works for scheduled, sent and failed reminders. Cancelled reminders are
        rejected: snoozing must never silently reactivate something the user
        cancelled - they should set ``status: scheduled`` explicitly instead.
        """
        reminder = self.get_object()
        if reminder.status == Reminder.Status.CANCELLED:
            return Response(
                {'detail': 'Cancelled reminders cannot be snoozed. Reschedule it instead.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        serializer = ReminderSnoozeSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        base = max(reminder.remind_at, timezone.now())
        reminder.remind_at = base + timedelta(minutes=serializer.validated_data['minutes'])
        reset_fields = reminder.reset_delivery_state()
        reminder.save(update_fields=['remind_at', 'updated_at', *reset_fields])

        return Response(ReminderSerializer(reminder, context={'request': request}).data)


class ReminderNotificationViewSet(
    mixins.ListModelMixin,
    mixins.RetrieveModelMixin,
    mixins.DestroyModelMixin,
    viewsets.GenericViewSet,
):
    """
    Notifications produced when reminders fire.

    ``GET /api/reminders/notifications/?unread=1`` lists only unread items.
    """

    serializer_class = ReminderNotificationSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        queryset = ReminderNotification.objects.filter(user=self.request.user)
        if self.request.query_params.get('unread') in ('1', 'true'):
            queryset = queryset.filter(read_at__isnull=True)
        return queryset

    def list(self, request, *args, **kwargs):
        user = getattr(request, 'user', None)
        if user and user.is_authenticated:
            try:
                dispatch_due_reminders(user=user)
            except Exception:
                logger.exception("Request-time reminder dispatch failed for notifications list")
        return super().list(request, *args, **kwargs)

    @action(detail=True, methods=['post'])
    def read(self, request, pk=None):
        notification = self.get_object()
        if notification.read_at is None:
            notification.read_at = timezone.now()
            notification.save(update_fields=['read_at'])
        return Response(self.get_serializer(notification).data)

    @action(detail=False, methods=['post'], url_path='read-all')
    def read_all(self, request):
        updated = (
            self.get_queryset()
            .filter(read_at__isnull=True)
            .update(read_at=timezone.now())
        )
        return Response({'updated': updated}, status=status.HTTP_200_OK)
