from rest_framework import serializers

from .models import Task


class TaskSerializer(serializers.ModelSerializer):
    dueDate = serializers.DateField(
        source='due_date',
        allow_null=True,
        required=False,
    )
    createdAt = serializers.DateTimeField(
        source='created_at',
        read_only=True,
    )
    updatedAt = serializers.DateTimeField(
        source='updated_at',
        read_only=True,
    )

    class Meta:
        model = Task
        fields = [
            'id',
            'title',
            'description',
            'dueDate',
            'priority',
            'category',
            'completed',
            'createdAt',
            'updatedAt',
        ]
        read_only_fields = ['id', 'createdAt', 'updatedAt']

    def validate_title(self, value):
        if not value.strip():
            raise serializers.ValidationError('Title cannot be blank.')
        return value.strip()
