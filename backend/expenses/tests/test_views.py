from decimal import Decimal
from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APIClient, APITestCase

from expenses.models import Expense

User = get_user_model()


class ExpenseViewSetTests(APITestCase):
    """Unit tests for the ExpenseViewSet API endpoints."""

    def setUp(self):
        self.client = APIClient()
        self.user_a = User.objects.create_user(
            email="usera@example.com",
            password="Password123!",
            full_name="User A",
        )
        self.user_b = User.objects.create_user(
            email="userb@example.com",
            password="Password123!",
            full_name="User B",
        )
        self.client.force_authenticate(user=self.user_a)

    def test_list_expenses_only_returns_user_own_expenses(self):
        """Test list endpoint only returns expenses belonging to the authenticated user."""
        Expense.objects.create(
            user=self.user_a,
            title="User A Expense",
            amount=Decimal("20.00"),
            category=Expense.Category.FOOD,
            date="2026-07-24",
        )
        Expense.objects.create(
            user=self.user_b,
            title="User B Expense",
            amount=Decimal("50.00"),
            category=Expense.Category.TRANSPORTATION,
            date="2026-07-24",
        )

        response = self.client.get("/api/expenses/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["title"], "User A Expense")

    def test_create_expense_success_camelcase_response(self):
        """Test creating an expense returns HTTP 201 and camelCase output keys."""
        payload = {
            "title": "Netflix Subscription",
            "amount": 15.99,
            "category": "Subscription",
            "date": "2026-07-24",
            "paymentMethod": "Card",
            "notes": "Monthly HD plan",
            "receiptImage": "https://example.com/netflix.pdf",
            "isRecurring": True,
            "recurringInterval": "monthly",
            "tags": ["entertainment", "streaming"],
        }
        response = self.client.post("/api/expenses/", payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["title"], "Netflix Subscription")
        self.assertEqual(Decimal(str(response.data["amount"])), Decimal("15.99"))
        self.assertEqual(response.data["paymentMethod"], "Card")
        self.assertEqual(response.data["receiptImage"], "https://example.com/netflix.pdf")
        self.assertTrue(response.data["isRecurring"])
        self.assertEqual(response.data["recurringInterval"], "monthly")
        self.assertEqual(response.data["tags"], ["entertainment", "streaming"])
        self.assertIn("createdAt", response.data)
        self.assertIn("updatedAt", response.data)

    def test_retrieve_expense_owner_only(self):
        """Test retrieving a specific expense by ID for the owner."""
        expense = Expense.objects.create(
            user=self.user_a,
            title="Dinner",
            amount=Decimal("35.00"),
            category=Expense.Category.FOOD,
            date="2026-07-24",
        )
        response = self.client.get(f"/api/expenses/{expense.id}/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["id"], str(expense.id))
        self.assertEqual(response.data["title"], "Dinner")

    def test_update_expense_patch(self):
        """Test updating an expense via PATCH."""
        expense = Expense.objects.create(
            user=self.user_a,
            title="Book",
            amount=Decimal("15.00"),
            category=Expense.Category.EDUCATION,
            date="2026-07-24",
        )
        payload = {"amount": 18.50, "notes": "Updated price"}
        response = self.client.patch(f"/api/expenses/{expense.id}/", payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(Decimal(str(response.data["amount"])), Decimal("18.50"))
        self.assertEqual(response.data["notes"], "Updated price")

    def test_delete_expense(self):
        """Test deleting an expense via DELETE endpoint."""
        expense = Expense.objects.create(
            user=self.user_a,
            title="Temporary Expense",
            amount=Decimal("10.00"),
            category=Expense.Category.OTHERS,
            date="2026-07-24",
        )
        response = self.client.delete(f"/api/expenses/{expense.id}/")
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(Expense.objects.filter(id=expense.id).exists())

    def test_unauthenticated_request_returns_401(self):
        """Test that unauthenticated requests return HTTP 401 Unauthorized."""
        self.client.force_authenticate(user=None)
        response = self.client.get("/api/expenses/")
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_cross_user_access_returns_404(self):
        """Test user cannot retrieve or modify another user's expense."""
        expense_b = Expense.objects.create(
            user=self.user_b,
            title="User B Private Expense",
            amount=Decimal("100.00"),
            category=Expense.Category.BILLS,
            date="2026-07-24",
        )
        response = self.client.get(f"/api/expenses/{expense_b.id}/")
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_validate_amount_zero_or_negative_returns_400(self):
        """Test that submitting zero or negative amount raises validation error."""
        payload_zero = {
            "title": "Zero Expense",
            "amount": 0.00,
            "category": "Food",
            "date": "2026-07-24",
        }
        res_zero = self.client.post("/api/expenses/", payload_zero, format="json")
        self.assertEqual(res_zero.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("amount", res_zero.data)

        payload_neg = {
            "title": "Negative Expense",
            "amount": -25.00,
            "category": "Food",
            "date": "2026-07-24",
        }
        res_neg = self.client.post("/api/expenses/", payload_neg, format="json")
        self.assertEqual(res_neg.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("amount", res_neg.data)

    def test_validate_recurring_without_interval_returns_400(self):
        """Test that submitting isRecurring=true without recurringInterval raises 400 validation error."""
        payload = {
            "title": "Invalid Recurring",
            "amount": 25.00,
            "category": "Bills",
            "date": "2026-07-24",
            "isRecurring": True,
            "recurringInterval": None,
        }
        response = self.client.post("/api/expenses/", payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("recurringInterval", response.data)

    def test_tags_array_serialization(self):
        """Test string tags array field serialization and storage."""
        payload = {
            "title": "Flight Tickets",
            "amount": 350.00,
            "category": "Travel",
            "date": "2026-07-24",
            "tags": ["vacation", "flight", "summer2026"],
        }
        response = self.client.post("/api/expenses/", payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["tags"], ["vacation", "flight", "summer2026"])
