from decimal import Decimal

from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APIClient, APITestCase

from expenses.models import Expense

User = get_user_model()

SUMMARY_URL = "/api/analytics/summary/"


def _index(rows, *keys):
    """Index a list of bucket dicts by a tuple of keys for easy assertions."""
    return {tuple(row[k] for k in keys): row for row in rows}


class AnalyticsSummaryViewTests(APITestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            email="analytics@example.com", password="Password123!", full_name="Analytics User"
        )
        self.other = User.objects.create_user(
            email="other@example.com", password="Password123!", full_name="Other User"
        )
        self.client.force_authenticate(user=self.user)

        def add(title, amount, category, date, currency="BDT", method="Card", user=None):
            return Expense.objects.create(
                user=user or self.user,
                title=title,
                amount=Decimal(amount),
                category=category,
                date=date,
                currency=currency,
                payment_method=method,
            )

        # June 2026
        add("Groceries", "120.00", Expense.Category.FOOD, "2026-06-03")
        add("Bus", "30.00", Expense.Category.TRANSPORTATION, "2026-06-10", method="Cash")
        # July 2026 (two on the same day -> most active day)
        add("Dinner", "80.50", Expense.Category.FOOD, "2026-07-18")
        add("Taxi", "19.50", Expense.Category.TRANSPORTATION, "2026-07-18", method="Cash")
        add("Laptop", "1500.00", Expense.Category.SHOPPING, "2026-07-20", currency="USD")
        # Another user's expense must never leak
        add("Secret", "999.00", Expense.Category.OTHERS, "2026-07-18", user=self.other)

    def test_requires_authentication(self):
        response = APIClient().get(SUMMARY_URL)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_summary_groups_by_category_and_currency(self):
        response = self.client.get(SUMMARY_URL)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.data

        self.assertEqual(data["transactions"], 5)
        self.assertEqual(data["activeDays"], 4)
        self.assertEqual(data["activeMonths"], 2)

        totals = _index(data["totals"], "currency")
        self.assertAlmostEqual(totals[("BDT",)]["amount"], 250.0)
        self.assertEqual(totals[("BDT",)]["transactions"], 4)
        self.assertAlmostEqual(totals[("USD",)]["amount"], 1500.0)

        by_category = _index(data["byCategory"], "category", "currency")
        self.assertAlmostEqual(by_category[("Food", "BDT")]["amount"], 200.5)
        self.assertEqual(by_category[("Food", "BDT")]["transactions"], 2)
        self.assertAlmostEqual(by_category[("Transportation", "BDT")]["amount"], 49.5)
        self.assertAlmostEqual(by_category[("Shopping", "USD")]["amount"], 1500.0)
        # No bucket from the other user's "Others" expense
        self.assertNotIn(("Others", "BDT"), by_category)

    def test_summary_groups_by_month(self):
        data = self.client.get(SUMMARY_URL).data

        by_month = _index(data["byMonth"], "month", "currency")
        self.assertAlmostEqual(by_month[("2026-06", "BDT")]["amount"], 150.0)
        self.assertEqual(by_month[("2026-06", "BDT")]["transactions"], 2)
        self.assertAlmostEqual(by_month[("2026-07", "BDT")]["amount"], 100.0)
        self.assertAlmostEqual(by_month[("2026-07", "USD")]["amount"], 1500.0)
        # Months are sorted ascending
        self.assertEqual([row["month"] for row in data["byMonth"]], ["2026-06", "2026-07", "2026-07"])

        by_month_category = _index(data["byMonthCategory"], "month", "category", "currency")
        self.assertAlmostEqual(by_month_category[("2026-07", "Food", "BDT")]["amount"], 80.5)
        self.assertAlmostEqual(by_month_category[("2026-06", "Transportation", "BDT")]["amount"], 30.0)

    def test_summary_payment_methods_days_and_highlights(self):
        data = self.client.get(SUMMARY_URL).data

        by_payment = _index(data["byPaymentMethod"], "paymentMethod", "currency")
        self.assertAlmostEqual(by_payment[("Cash", "BDT")]["amount"], 49.5)
        self.assertAlmostEqual(by_payment[("Card", "BDT")]["amount"], 200.5)
        self.assertAlmostEqual(by_payment[("Card", "USD")]["amount"], 1500.0)

        by_day = _index(data["byDay"], "date", "currency")
        self.assertAlmostEqual(by_day[("2026-07-18", "BDT")]["amount"], 100.0)
        self.assertEqual(by_day[("2026-07-18", "BDT")]["transactions"], 2)

        # One candidate per currency, sorted by currency code
        largest = _index(data["largestExpenses"], "currency")
        self.assertEqual([row["currency"] for row in data["largestExpenses"]], ["BDT", "USD"])
        self.assertEqual(largest[("BDT",)]["title"], "Groceries")
        self.assertAlmostEqual(largest[("BDT",)]["amount"], 120.0)
        self.assertEqual(largest[("USD",)]["title"], "Laptop")
        self.assertAlmostEqual(largest[("USD",)]["amount"], 1500.0)
        self.assertEqual(data["mostActiveDay"], {"date": "2026-07-18", "transactions": 2})

    def test_summary_respects_inclusive_date_range(self):
        response = self.client.get(SUMMARY_URL, {"start": "2026-07-01", "end": "2026-07-18"})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.data

        self.assertEqual(data["range"], {"start": "2026-07-01", "end": "2026-07-18"})
        self.assertEqual(data["transactions"], 2)
        self.assertEqual([row["month"] for row in data["byMonth"]], ["2026-07"])
        self.assertEqual({row["category"] for row in data["byCategory"]}, {"Food", "Transportation"})
        # Only BDT expenses fall in the range, so the USD "Laptop" must not appear
        self.assertEqual(
            [(row["currency"], row["title"]) for row in data["largestExpenses"]],
            [("BDT", "Dinner")],
        )

    def test_largest_expenses_returns_top_candidate_per_currency(self):
        """
        Raw amounts across currencies are not comparable (20 USD may be worth
        more than 1500 BDT once converted), so the API must not pick a single
        winner by numeric amount. It returns the largest expense of *each*
        currency; the client converts them and chooses the real maximum.
        """
        client = APIClient()
        user = User.objects.create_user(
            email="mixed@example.com", password="Password123!", full_name="Mixed Currency"
        )
        client.force_authenticate(user=user)

        def add(title, amount, currency, date, **extra):
            return Expense.objects.create(
                user=user,
                title=title,
                amount=Decimal(amount),
                currency=currency,
                category=extra.get("category", Expense.Category.OTHERS),
                date=date,
                payment_method="Card",
            )

        add("Rent", "1500.00", "BDT", "2026-08-01")          # numerically largest overall
        add("Snacks", "40.00", "BDT", "2026-08-02")
        add("Coffee", "20.00", "USD", "2026-08-03")           # largest USD, numerically tiny
        add("Pen", "2.50", "USD", "2026-08-04")
        add("Book", "30.00", "EUR", "2026-08-05")
        add("Book", "30.00", "EUR", "2026-08-09")             # tie on amount -> latest date wins

        data = client.get(SUMMARY_URL).data

        # Exactly one row per currency, never the full expense list
        self.assertEqual(len(data["largestExpenses"]), 3)
        self.assertEqual([row["currency"] for row in data["largestExpenses"]], ["BDT", "EUR", "USD"])

        by_currency = _index(data["largestExpenses"], "currency")
        self.assertEqual(by_currency[("BDT",)]["title"], "Rent")
        self.assertAlmostEqual(by_currency[("BDT",)]["amount"], 1500.0)
        self.assertEqual(by_currency[("USD",)]["title"], "Coffee")
        self.assertAlmostEqual(by_currency[("USD",)]["amount"], 20.0)
        self.assertEqual(by_currency[("EUR",)]["title"], "Book")
        self.assertEqual(by_currency[("EUR",)]["date"], "2026-08-09")

        # Each candidate carries what the client needs to convert and display it
        for row in data["largestExpenses"]:
            self.assertEqual(
                set(row), {"id", "title", "amount", "currency", "category", "date"}
            )

        # Date filtering applies to the candidates too
        ranged = client.get(SUMMARY_URL, {"start": "2026-08-02", "end": "2026-08-04"}).data
        self.assertEqual(
            [(row["currency"], row["title"]) for row in ranged["largestExpenses"]],
            [("BDT", "Snacks"), ("USD", "Coffee")],
        )

    def test_summary_rejects_invalid_range(self):
        inverted = self.client.get(SUMMARY_URL, {"start": "2026-07-31", "end": "2026-07-01"})
        self.assertEqual(inverted.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("end", inverted.data)

        malformed = self.client.get(SUMMARY_URL, {"start": "not-a-date"})
        self.assertEqual(malformed.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("start", malformed.data)

    def test_summary_for_user_without_expenses_is_empty(self):
        client = APIClient()
        client.force_authenticate(user=User.objects.create_user(
            email="empty@example.com", password="Password123!", full_name="Empty"
        ))
        data = client.get(SUMMARY_URL).data
        self.assertEqual(data["transactions"], 0)
        self.assertEqual(data["totals"], [])
        self.assertEqual(data["byCategory"], [])
        self.assertEqual(data["byMonth"], [])
        self.assertEqual(data["largestExpenses"], [])
        self.assertIsNone(data["mostActiveDay"])
