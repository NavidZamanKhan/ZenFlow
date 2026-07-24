from rest_framework import serializers

from .models import Expense


class ExpenseSerializer(serializers.ModelSerializer):
    paymentMethod = serializers.ChoiceField(
        choices=Expense.PaymentMethod.choices,
        source='payment_method',
        default=Expense.PaymentMethod.CARD,
    )
    receiptImage = serializers.URLField(
        source='receipt_image',
        allow_null=True,
        required=False,
        default=None,
    )
    isRecurring = serializers.BooleanField(
        source='is_recurring',
        default=False,
    )
    recurringInterval = serializers.ChoiceField(
        choices=Expense.RecurringInterval.choices,
        source='recurring_interval',
        allow_null=True,
        required=False,
        default=None,
    )
    tags = serializers.ListField(
        child=serializers.CharField(max_length=50),
        required=False,
        default=list,
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
        model = Expense
        fields = [
            'id',
            'title',
            'amount',
            'category',
            'date',
            'paymentMethod',
            'notes',
            'receiptImage',
            'isRecurring',
            'recurringInterval',
            'tags',
            'createdAt',
            'updatedAt',
        ]
        read_only_fields = ['id', 'createdAt', 'updatedAt']
        extra_kwargs = {
            'amount': {'coerce_to_string': False},
        }

    def validate_amount(self, value):
        if value <= 0:
            raise serializers.ValidationError('Amount must be a positive number.')
        return value

    def validate(self, attrs):
        is_recurring = attrs.get(
            'is_recurring',
            self.instance.is_recurring if self.instance else False,
        )
        recurring_interval = attrs.get(
            'recurring_interval',
            self.instance.recurring_interval if self.instance else None,
        )

        if is_recurring and not recurring_interval:
            raise serializers.ValidationError(
                {'recurringInterval': 'Choose a recurring interval.'}
            )

        return attrs
