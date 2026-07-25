from decimal import Decimal

from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APIClient, APITestCase

from budget.models import Budget

User = get_user_model()


class BudgetDetailViewTests(APITestCase):
    """Integration tests for the BudgetDetailView API endpoint."""

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

    def test_get_lazy_creates_default_budget_on_first_access(self):
        """Test GET creates a default budget record on first access for a new user."""
        self.assertEqual(Budget.objects.filter(user=self.user_a).count(), 0)

        response = self.client.get("/api/budget/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["monthlyTotal"], 0.0)
        self.assertEqual(
            response.data["warningThresholds"],
            [50, 75, 90, 100],
        )
        self.assertEqual(response.data["alertedThresholds"], {})
        self.assertEqual(len(response.data["categoryBudgets"]), 10)
        self.assertEqual(Budget.objects.filter(user=self.user_a).count(), 1)

    def test_get_returns_same_existing_budget_on_subsequent_access(self):
        """Test GET returns the existing budget and does not create duplicate rows on subsequent calls."""
        self.client.get("/api/budget/")
        self.assertEqual(Budget.objects.filter(user=self.user_a).count(), 1)

        # Call GET again
        response = self.client.get("/api/budget/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(Budget.objects.filter(user=self.user_a).count(), 1)

    def test_put_partial_update(self):
        """Test PUT partially updates provided fields without affecting omitted fields."""
        payload = {
            "monthlyTotal": 1200.0,
            "categoryBudgets": {"Food": 350, "Bills": 200},
        }
        response = self.client.put("/api/budget/", data=payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["monthlyTotal"], 1200.0)
        self.assertEqual(
            response.data["categoryBudgets"],
            {"Food": 350, "Bills": 200},
        )
        self.assertEqual(
            response.data["warningThresholds"],
            [50, 75, 90, 100],
        )

        budget = Budget.objects.get(user=self.user_a)
        self.assertEqual(budget.monthly_total, Decimal("1200.00"))
        self.assertEqual(
            budget.category_budgets,
            {"Food": 350, "Bills": 200},
        )
        self.assertEqual(budget.warning_thresholds, [50, 75, 90, 100])

    def test_put_validation_invalid_category_key(self):
        """Test PUT returns 400 when categoryBudgets contains an unknown category."""
        payload = {"categoryBudgets": {"UnknownCategory": 100}}
        response = self.client.put("/api/budget/", data=payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("categoryBudgets", response.data)

    def test_put_validation_negative_category_value(self):
        """Test PUT returns 400 when categoryBudgets contains a negative budget amount."""
        payload = {"categoryBudgets": {"Food": -50}}
        response = self.client.put("/api/budget/", data=payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("categoryBudgets", response.data)

    def test_put_ignores_read_only_alerted_thresholds(self):
        """Test PUT ignores alertedThresholds payload and leaves stored value untouched."""
        budget = Budget.objects.create(
            user=self.user_a,
            alerted_thresholds={"2026-07": {"Food": [50]}},
        )
        payload = {
            "monthlyTotal": 800.0,
            "alertedThresholds": {"2026-07": {"Food": [50, 75]}},
        }
        response = self.client.put("/api/budget/", data=payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["monthlyTotal"], 800.0)
        self.assertEqual(
            response.data["alertedThresholds"],
            {"2026-07": {"Food": [50]}},
        )

        budget.refresh_from_db()
        self.assertEqual(
            budget.alerted_thresholds,
            {"2026-07": {"Food": [50]}},
        )

    def test_unauthenticated_requests_return_401(self):
        """Test GET and PUT return 401 Unauthorized for unauthenticated clients."""
        unauthenticated_client = APIClient()

        get_res = unauthenticated_client.get("/api/budget/")
        self.assertEqual(get_res.status_code, status.HTTP_401_UNAUTHORIZED)

        put_res = unauthenticated_client.put(
            "/api/budget/",
            data={"monthlyTotal": 500},
            format="json",
        )
        self.assertEqual(put_res.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_user_budget_isolation(self):
        """Test User A and User B receive their own distinct budget instances."""
        # Create budget for User A
        self.client.force_authenticate(user=self.user_a)
        self.client.put(
            "/api/budget/",
            data={"monthlyTotal": 1500.0},
            format="json",
        )

        # Authenticate as User B
        client_b = APIClient()
        client_b.force_authenticate(user=self.user_b)
        res_b = client_b.get("/api/budget/")
        self.assertEqual(res_b.status_code, status.HTTP_200_OK)
        self.assertEqual(res_b.data["monthlyTotal"], 0.0)

        # Mutate User B budget
        client_b.put(
            "/api/budget/",
            data={"monthlyTotal": 3000.0},
            format="json",
        )

        # Confirm User A budget remains 1500.0
        res_a = self.client.get("/api/budget/")
        self.assertEqual(res_a.data["monthlyTotal"], 1500.0)
