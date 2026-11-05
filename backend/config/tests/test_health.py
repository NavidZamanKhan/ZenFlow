from django.test import TestCase


class HealthEndpointTests(TestCase):
    def test_health_reports_ok_with_database(self):
        response = self.client.get("/api/health/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), {"status": "ok", "database": "ok"})
