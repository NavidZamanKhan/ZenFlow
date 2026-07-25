from rest_framework import serializers

from expenses.models import Expense
from .models import Budget


class BudgetSerializer(serializers.ModelSerializer):
    monthlyTotal = serializers.DecimalField(
        source='monthly_total',
        max_digits=12,
        decimal_places=2,
        min_value=0,
        coerce_to_string=False,
    )
    categoryBudgets = serializers.JSONField(
        source='category_budgets',
    )
    warningThresholds = serializers.ListField(
        child=serializers.IntegerField(min_value=0, max_value=200),
        source='warning_thresholds',
    )
    alertedThresholds = serializers.JSONField(
        source='alerted_thresholds',
        read_only=True,
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
        model = Budget
        fields = [
            'monthlyTotal',
            'categoryBudgets',
            'warningThresholds',
            'alertedThresholds',
            'createdAt',
            'updatedAt',
        ]
        read_only_fields = ['alertedThresholds', 'createdAt', 'updatedAt']

    def validate_categoryBudgets(self, value):
        if not isinstance(value, dict):
            raise serializers.ValidationError('categoryBudgets must be a dictionary.')

        valid_categories = set(Expense.Category.values)

        for category, amount in value.items():
            if category not in valid_categories:
                raise serializers.ValidationError(
                    f"'{category}' is not a valid expense category."
                )
            if not isinstance(amount, (int, float)) or amount < 0:
                raise serializers.ValidationError(
                    f"Budget for '{category}' must be a non-negative number."
                )

        return value
