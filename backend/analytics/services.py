"""
Server-side expense aggregation.

Expenses are stored in the currency they were paid in, so every bucket is
grouped by ``currency`` as well as by its dimension (category, month, ...).
The client sums buckets after converting each one to the user's display
currency with its exchange-rate table - that keeps the heavy GROUP BY work in
the database while leaving currency presentation to the UI layer, which owns
the live rates.
"""

from __future__ import annotations

from datetime import date
from decimal import Decimal

from django.db.models import Count, F, Sum, Window
from django.db.models.functions import RowNumber, TruncMonth
from django.utils import timezone

from expenses.models import Expense


def _money(value: Decimal | None) -> float:
    return float(value or 0)


def _month_key(value: date) -> str:
    return value.strftime("%Y-%m")


def build_expense_summary(user, start: date | None = None, end: date | None = None) -> dict:
    """Aggregate the user's expenses, optionally limited to an inclusive date range."""
    queryset = Expense.objects.filter(user=user).order_by()
    if start:
        queryset = queryset.filter(date__gte=start)
    if end:
        queryset = queryset.filter(date__lte=end)

    totals = [
        {
            "currency": row["currency"],
            "amount": _money(row["amount"]),
            "transactions": row["transactions"],
        }
        for row in queryset.values("currency")
        .annotate(amount=Sum("amount"), transactions=Count("id"))
        .order_by("currency")
    ]

    by_category = [
        {
            "category": row["category"],
            "currency": row["currency"],
            "amount": _money(row["amount"]),
            "transactions": row["transactions"],
        }
        for row in queryset.values("category", "currency")
        .annotate(amount=Sum("amount"), transactions=Count("id"))
        .order_by("category", "currency")
    ]

    by_month = [
        {
            "month": _month_key(row["month"]),
            "currency": row["currency"],
            "amount": _money(row["amount"]),
            "transactions": row["transactions"],
        }
        for row in queryset.annotate(month=TruncMonth("date"))
        .values("month", "currency")
        .annotate(amount=Sum("amount"), transactions=Count("id"))
        .order_by("month", "currency")
    ]

    by_month_category = [
        {
            "month": _month_key(row["month"]),
            "category": row["category"],
            "currency": row["currency"],
            "amount": _money(row["amount"]),
            "transactions": row["transactions"],
        }
        for row in queryset.annotate(month=TruncMonth("date"))
        .values("month", "category", "currency")
        .annotate(amount=Sum("amount"), transactions=Count("id"))
        .order_by("month", "category", "currency")
    ]

    by_payment_method = [
        {
            "paymentMethod": row["payment_method"],
            "currency": row["currency"],
            "amount": _money(row["amount"]),
            "transactions": row["transactions"],
        }
        for row in queryset.values("payment_method", "currency")
        .annotate(amount=Sum("amount"), transactions=Count("id"))
        .order_by("payment_method", "currency")
    ]

    by_day = [
        {
            "date": row["date"].isoformat(),
            "currency": row["currency"],
            "amount": _money(row["amount"]),
            "transactions": row["transactions"],
        }
        for row in queryset.values("date", "currency")
        .annotate(amount=Sum("amount"), transactions=Count("id"))
        .order_by("date", "currency")
    ]

    # Raw amounts in different currencies are not comparable, so the single
    # "largest expense" can only be decided after conversion - which the client
    # owns. Return the top expense *per currency* (one row each) and let the
    # client convert those candidates and pick the real maximum.
    largest_expenses = [
        {
            "id": str(expense.id),
            "title": expense.title,
            "amount": _money(expense.amount),
            "currency": expense.currency,
            "category": expense.category,
            "date": expense.date.isoformat(),
        }
        for expense in queryset.annotate(
            rank=Window(
                expression=RowNumber(),
                partition_by=[F("currency")],
                order_by=[F("amount").desc(), F("date").desc(), F("created_at").desc()],
            )
        )
        .filter(rank=1)
        .order_by("currency")
    ]

    most_active = (
        queryset.values("date")
        .annotate(transactions=Count("id"))
        .order_by("-transactions", "-date")
        .first()
    )

    return {
        "range": {
            "start": start.isoformat() if start else None,
            "end": end.isoformat() if end else None,
        },
        "generatedAt": timezone.now().isoformat(),
        "transactions": sum(item["transactions"] for item in totals),
        "activeDays": queryset.values("date").distinct().count(),
        "activeMonths": queryset.annotate(month=TruncMonth("date")).values("month").distinct().count(),
        "totals": totals,
        "byCategory": by_category,
        "byMonth": by_month,
        "byMonthCategory": by_month_category,
        "byPaymentMethod": by_payment_method,
        "byDay": by_day,
        "largestExpenses": largest_expenses,
        "mostActiveDay": (
            {"date": most_active["date"].isoformat(), "transactions": most_active["transactions"]}
            if most_active
            else None
        ),
    }
