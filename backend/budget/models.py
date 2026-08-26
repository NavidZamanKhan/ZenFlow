import uuid

from django.conf import settings
from django.contrib.postgres.fields import ArrayField
from django.db import models


def default_category_budgets():
    return {
        "Food": 0,
        "Transportation": 0,
        "Bills": 0,
        "Shopping": 0,
        "Entertainment": 0,
        "Education": 0,
        "Healthcare": 0,
        "Travel": 0,
        "Subscription": 0,
        "Others": 0,
    }


def default_warning_thresholds():
    return [50, 75, 90, 100]


def default_alerted_thresholds():
    return {}


class Budget(models.Model):
    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
    )
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='budget',
    )
    monthly_total = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=0.00,
    )
    currency = models.CharField(
        max_length=10,
        default='BDT',
    )
    category_budgets = models.JSONField(
        default=default_category_budgets,
    )
    warning_thresholds = ArrayField(
        models.IntegerField(),
        default=default_warning_thresholds,
    )
    alerted_thresholds = models.JSONField(
        default=default_alerted_thresholds,
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Budget for {self.user}"
