import uuid
from decimal import Decimal
from django.contrib.auth import get_user_model
from django.test import TestCase

from expenses.models import Expense

User = get_user_model()


class ExpenseModelTests(TestCase):
    """Unit tests for the Expense model."""

    def setUp(self):
        self.user = User.objects.create_user(
            email="testuser@example.com",
            password="TestPassword123!",
            full_name="Test User",
        )

    def test_create_expense_all_fields(self):
        """Test creating an expense with all fields populated."""
        expense = Expense.objects.create(
            user=self.user,
            title="Groceries",
            amount=Decimal("125.50"),
            category=Expense.Category.FOOD,
            date="2026-07-24",
            payment_method=Expense.PaymentMethod.CARD,
            notes="Weekly grocery shopping",
            receipt_image="https://example.com/receipt.jpg",
            is_recurring=True,
            recurring_interval=Expense.RecurringInterval.WEEKLY,
            tags=["groceries", "food"],
        )
        self.assertEqual(expense.title, "Groceries")
        self.assertEqual(expense.amount, Decimal("125.50"))
        self.assertEqual(expense.category, Expense.Category.FOOD)
        self.assertEqual(expense.date, "2026-07-24")
        self.assertEqual(expense.payment_method, Expense.PaymentMethod.CARD)
        self.assertEqual(expense.notes, "Weekly grocery shopping")
        self.assertEqual(expense.receipt_image, "https://example.com/receipt.jpg")
        self.assertTrue(expense.is_recurring)
        self.assertEqual(expense.recurring_interval, Expense.RecurringInterval.WEEKLY)
        self.assertEqual(expense.tags, ["groceries", "food"])

    def test_create_expense_defaults(self):
        """Test default values when creating an expense with minimal required fields."""
        expense = Expense.objects.create(
            user=self.user,
            title="Coffee",
            amount=Decimal("4.50"),
            category=Expense.Category.FOOD,
            date="2026-07-24",
        )
        self.assertEqual(expense.payment_method, Expense.PaymentMethod.CARD)
        self.assertEqual(expense.notes, "")
        self.assertIsNone(expense.receipt_image)
        self.assertFalse(expense.is_recurring)
        self.assertIsNone(expense.recurring_interval)
        self.assertEqual(expense.tags, [])

    def test_expense_id_is_uuid(self):
        """Test that expense id primary key is a UUID instance."""
        expense = Expense.objects.create(
            user=self.user,
            title="Taxi",
            amount=Decimal("15.00"),
            category=Expense.Category.TRANSPORTATION,
            date="2026-07-24",
        )
        self.assertIsInstance(expense.id, uuid.UUID)

    def test_expense_str_method(self):
        """Test that __str__ returns formatted title and amount."""
        expense = Expense.objects.create(
            user=self.user,
            title="Lunch",
            amount=Decimal("12.50"),
            category=Expense.Category.FOOD,
            date="2026-07-24",
        )
        self.assertEqual(str(expense), "Lunch (12.50)")

    def test_user_foreign_key_cascade_delete(self):
        """Test that deleting a User cascades and deletes associated expenses."""
        expense = Expense.objects.create(
            user=self.user,
            title="Dinner",
            amount=Decimal("45.00"),
            category=Expense.Category.FOOD,
            date="2026-07-24",
        )
        expense_id = expense.id
        self.assertTrue(Expense.objects.filter(id=expense_id).exists())

        self.user.delete()
        self.assertFalse(Expense.objects.filter(id=expense_id).exists())
