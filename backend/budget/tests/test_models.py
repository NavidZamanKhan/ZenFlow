from decimal import Decimal

from django.contrib.auth import get_user_model
from django.db import IntegrityError
from django.test import TestCase

from budget.models import Budget

User = get_user_model()


class BudgetModelTests(TestCase):
    """Unit tests for the Budget model."""

    def setUp(self):
        self.user = User.objects.create_user(
            email="budgetuser@example.com",
            password="Password123!",
            full_name="Budget User",
        )

    def test_default_budget_creation(self):
        """Test default Budget creation fields and default callables."""
        budget = Budget.objects.create(user=self.user)
        self.assertEqual(budget.monthly_total, Decimal("0.00"))
        self.assertEqual(
            budget.warning_thresholds,
            [50, 75, 90, 100],
        )
        self.assertEqual(budget.alerted_thresholds, {})

        expected_categories = {
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
        self.assertEqual(budget.category_budgets, expected_categories)
        self.assertEqual(len(budget.category_budgets), 10)

    def test_onetoone_cascade_delete(self):
        """Test deleting a User deletes their associated Budget."""
        budget = Budget.objects.create(user=self.user)
        budget_id = budget.id
        self.assertTrue(Budget.objects.filter(id=budget_id).exists())

        self.user.delete()
        self.assertFalse(Budget.objects.filter(id=budget_id).exists())

    def test_str_representation(self):
        """Test __str__ method formatted string output."""
        budget = Budget.objects.create(user=self.user)
        self.assertEqual(str(budget), f"Budget for {self.user}")

    def test_user_can_only_have_one_budget(self):
        """Test attempting to create a second Budget for the same user raises IntegrityError."""
        Budget.objects.create(user=self.user)
        with self.assertRaises(IntegrityError):
            Budget.objects.create(user=self.user)
