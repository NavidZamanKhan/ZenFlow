from rest_framework import serializers

from .models import Event


class EventSerializer(serializers.ModelSerializer):
    class Meta:
        model = Event
        fields = [
            'id',
            'title',
            'description',
            'start_datetime',
            'end_datetime',
            'all_day',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

    def validate_title(self, value):
        if not value.strip():
            raise serializers.ValidationError('Title cannot be blank.')
        return value.strip()

    def validate(self, attrs):
        start = attrs.get('start_datetime', getattr(self.instance, 'start_datetime', None))
        end = attrs.get('end_datetime', getattr(self.instance, 'end_datetime', None))
        if start and end and end < start:
            raise serializers.ValidationError({'end_datetime': 'End must be after start.'})
        return attrs
