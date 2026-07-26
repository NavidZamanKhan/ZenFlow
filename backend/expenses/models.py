import uuid

from django.conf import settings
from django.contrib.postgres.fields import ArrayField
from django.db import models


class Expense(models.Model):
    class Category(models.TextChoices):
        FOOD = 'Food', 'Food'
        TRANSPORTATION = 'Transportation', 'Transportation'
        BILLS = 'Bills', 'Bills'
        SHOPPING = 'Shopping', 'Shopping'
        ENTERTAINMENT = 'Entertainment', 'Entertainment'
        EDUCATION = 'Education', 'Education'
        HEALTHCARE = 'Healthcare', 'Healthcare'
        TRAVEL = 'Travel', 'Travel'
        SUBSCRIPTION = 'Subscription', 'Subscription'
        OTHERS = 'Others', 'Others'

    class PaymentMethod(models.TextChoices):
        CASH = 'Cash', 'Cash'
        CARD = 'Card', 'Card'
        BANK_TRANSFER = 'Bank Transfer', 'Bank Transfer'
        MOBILE_WALLET = 'Mobile Wallet', 'Mobile Wallet'
        OTHER = 'Other', 'Other'

    class RecurringInterval(models.TextChoices):
        WEEKLY = 'weekly', 'Weekly'
        MONTHLY = 'monthly', 'Monthly'
        YEARLY = 'yearly', 'Yearly'

    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='expenses',
    )
    title = models.CharField(max_length=255)
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    category = models.CharField(max_length=50, choices=Category.choices)
    date = models.DateField()
    payment_method = models.CharField(
        max_length=50,
        choices=PaymentMethod.choices,
        default=PaymentMethod.CARD,
    )
    notes = models.TextField(blank=True)
    receipt_image = models.URLField(null=True, blank=True)
    is_recurring = models.BooleanField(default=False)
    recurring_interval = models.CharField(
        max_length=20,
        choices=RecurringInterval.choices,
        null=True,
        blank=True,
    )
    tags = ArrayField(
        models.CharField(max_length=50),
        default=list,
        blank=True,
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-date', '-created_at']

    def __str__(self):
        return f"{self.title} ({self.amount})"

