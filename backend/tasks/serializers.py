from rest_framework import serializers

from .models import Task


class TaskSerializer(serializers.ModelSerializer):
    dueDate = serializers.DateField(
        source='due_date',
        allow_null=True,
        required=False,
    )
    dueTime = serializers.TimeField(
        source='due_time',
        allow_null=True,
        required=False,
        format='%H:%M',
        input_formats=['%H:%M', '%H:%M:%S'],
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
            'dueTime',
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

    def validate(self, data):
        instance = self.instance

        if instance is not None:
            due_date = data.get('due_date', instance.due_date)
            due_time = data.get('due_time', instance.due_time)
        else:
            due_date = data.get('due_date')
            due_time = data.get('due_time')

        if 'due_time' in data and data.get('due_time') is not None and due_date is None:
            raise serializers.ValidationError(
                {'dueTime': 'Due time requires a due date.'},
            )

        if due_date is None:
            data['due_time'] = None

        return data
