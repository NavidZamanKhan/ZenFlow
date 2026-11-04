from rest_framework import serializers

from events.models import Event
from tasks.models import Task

from .models import Reminder, ReminderNotification


class ReminderSerializer(serializers.ModelSerializer):
    remindAt = serializers.DateTimeField(source='remind_at')
    sentAt = serializers.DateTimeField(source='sent_at', read_only=True)
    lastError = serializers.CharField(source='last_error', read_only=True)
    emailSentAt = serializers.DateTimeField(source='email_sent_at', read_only=True)
    emailAttempts = serializers.IntegerField(source='email_attempts', read_only=True)
    nextAttemptAt = serializers.DateTimeField(source='next_attempt_at', read_only=True)
    taskId = serializers.PrimaryKeyRelatedField(
        source='task',
        pk_field=serializers.UUIDField(format='hex_verbose'),
        queryset=Task.objects.none(),
        allow_null=True,
        required=False,
    )
    eventId = serializers.PrimaryKeyRelatedField(
        source='event',
        queryset=Event.objects.none(),
        allow_null=True,
        required=False,
    )
    createdAt = serializers.DateTimeField(source='created_at', read_only=True)
    updatedAt = serializers.DateTimeField(source='updated_at', read_only=True)

    class Meta:
        model = Reminder
        fields = [
            'id',
            'title',
            'message',
            'remindAt',
            'channel',
            'status',
            'sentAt',
            'lastError',
            'emailSentAt',
            'emailAttempts',
            'nextAttemptAt',
            'taskId',
            'eventId',
            'createdAt',
            'updatedAt',
        ]
        read_only_fields = [
            'id', 'sentAt', 'lastError', 'emailSentAt', 'emailAttempts', 'nextAttemptAt',
            'createdAt', 'updatedAt',
        ]

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        # Linked tasks/events must belong to the requesting user.
        request = self.context.get('request')
        user = getattr(request, 'user', None)
        if user is not None and user.is_authenticated:
            self.fields['taskId'].queryset = Task.objects.filter(user=user)
            self.fields['eventId'].queryset = Event.objects.filter(user=user)

    def validate_title(self, value):
        if not value.strip():
            raise serializers.ValidationError('Title cannot be blank.')
        return value.strip()

    def validate_status(self, value):
        # Clients may only schedule or cancel; "sent"/"failed" are set by the dispatcher.
        if value in Reminder.SCHEDULER_MANAGED_STATUSES:
            raise serializers.ValidationError(f'Status "{value}" is managed by the scheduler.')
        return value

    def validate(self, attrs):
        """
        Re-arm semantics. A reminder is re-armed - i.e. every delivery field is
        reset so it behaves like a brand-new scheduled reminder - when:

        * a ``sent``/``failed`` reminder gets a new ``remindAt`` (status is
          implicitly set back to ``scheduled``), or
        * the client explicitly sets ``status: scheduled`` on a reminder that
          is not currently scheduled, or
        * ``remindAt`` changes on a reminder that ends up ``scheduled`` (so a
          ``both`` reminder rescheduled mid-retry notifies again at the new time).

        Only editing title/message/channel never touches delivery state.
        """
        instance = self.instance
        if instance is None:
            return attrs

        new_remind_at = attrs.get('remind_at')
        time_changed = new_remind_at is not None and new_remind_at != instance.remind_at

        if (
            time_changed
            and 'status' not in attrs
            and instance.status in Reminder.SCHEDULER_MANAGED_STATUSES
        ):
            attrs['status'] = Reminder.Status.SCHEDULED

        final_status = attrs.get('status', instance.status)
        if final_status == Reminder.Status.SCHEDULED and (
            time_changed or instance.status != Reminder.Status.SCHEDULED
        ):
            attrs.update(Reminder.delivery_reset_values())
        return attrs


class ReminderSnoozeSerializer(serializers.Serializer):
    minutes = serializers.IntegerField(min_value=1, max_value=60 * 24 * 30, default=10)


class ReminderNotificationSerializer(serializers.ModelSerializer):
    reminderId = serializers.PrimaryKeyRelatedField(source='reminder', read_only=True)
    read = serializers.BooleanField(source='is_read', read_only=True)
    readAt = serializers.DateTimeField(source='read_at', read_only=True)
    createdAt = serializers.DateTimeField(source='created_at', read_only=True)

    class Meta:
        model = ReminderNotification
        fields = ['id', 'reminderId', 'title', 'body', 'href', 'read', 'readAt', 'createdAt']
        read_only_fields = fields
