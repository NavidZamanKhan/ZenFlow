from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework import status
from rest_framework.test import APIClient

from tasks.models import Task

User = get_user_model()


class TaskViewSetTests(TestCase):
    """Unit tests for TaskViewSet API endpoints."""

    def setUp(self):
        self.client_a = APIClient()
        self.user_a = User.objects.create_user(
            email="usera@example.com",
            password="Password123!",
            full_name="User A",
        )
        self.client_a.force_authenticate(user=self.user_a)

        self.client_b = APIClient()
        self.user_b = User.objects.create_user(
            email="userb@example.com",
            password="Password123!",
            full_name="User B",
        )
        self.client_b.force_authenticate(user=self.user_b)

        self.anon_client = APIClient()
        self.list_url = "/api/tasks/"

    def test_list_tasks_returns_owner_tasks_only(self):
        """Test GET /api/tasks/ returns only tasks belonging to authenticated user."""
        Task.objects.create(user=self.user_a, title="User A Task")
        Task.objects.create(user=self.user_b, title="User B Task")

        response = self.client_a.get(self.list_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["title"], "User A Task")

    def test_create_task_camelcase_response_shape(self):
        """Test POST /api/tasks/ creates task and returns camelCase keys."""
        payload = {
            "title": "New Task",
            "description": "Task description",
            "dueDate": "2026-08-15",
            "priority": "high",
            "category": "Work",
        }
        response = self.client_a.post(self.list_url, payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        data = response.data
        self.assertIn("id", data)
        self.assertIn("dueDate", data)
        self.assertIn("createdAt", data)
        self.assertIn("updatedAt", data)

        self.assertNotIn("due_date", data)
        self.assertNotIn("created_at", data)
        self.assertNotIn("updated_at", data)

        self.assertEqual(data["title"], "New Task")
        self.assertEqual(data["dueDate"], "2026-08-15")

    def test_retrieve_task_owner_only(self):
        """Test GET /api/tasks/{id}/ retrieves single task for owner."""
        task = Task.objects.create(user=self.user_a, title="User A Task")
        url = f"{self.list_url}{task.id}/"

        response = self.client_a.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["id"], str(task.id))
        self.assertEqual(response.data["title"], "User A Task")

    def test_partial_update_task(self):
        """Test PATCH /api/tasks/{id}/ updates partial fields."""
        task = Task.objects.create(user=self.user_a, title="Initial Title", completed=False)
        url = f"{self.list_url}{task.id}/"

        response = self.client_a.patch(url, {"completed": True}, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data["completed"])

        task.refresh_from_db()
        self.assertTrue(task.completed)

    def test_delete_task(self):
        """Test DELETE /api/tasks/{id}/ removes row from database."""
        task = Task.objects.create(user=self.user_a, title="Task to delete")
        url = f"{self.list_url}{task.id}/"

        response = self.client_a.delete(url)
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(Task.objects.filter(id=task.id).exists())

    def test_unauthenticated_requests_return_401(self):
        """Test unauthenticated requests to all endpoints return 401 Unauthorized."""
        task = Task.objects.create(user=self.user_a, title="Task")
        detail_url = f"{self.list_url}{task.id}/"

        res_list = self.anon_client.get(self.list_url)
        res_post = self.anon_client.post(self.list_url, {"title": "X"}, format="json")
        res_get = self.anon_client.get(detail_url)
        res_patch = self.anon_client.patch(detail_url, {"completed": True}, format="json")
        res_delete = self.anon_client.delete(detail_url)

        self.assertEqual(res_list.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(res_post.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(res_get.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(res_patch.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(res_delete.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_cannot_access_or_modify_other_user_task(self):
        """Test accessing or modifying another user's task returns 404 Not Found."""
        task_b = Task.objects.create(user=self.user_b, title="User B Secret Task")
        url_b = f"{self.list_url}{task_b.id}/"

        res_get = self.client_a.get(url_b)
        res_patch = self.client_a.patch(url_b, {"title": "Hacked"}, format="json")
        res_delete = self.client_a.delete(url_b)

        self.assertEqual(res_get.status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(res_patch.status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(res_delete.status_code, status.HTTP_404_NOT_FOUND)

    def test_create_task_blank_title_returns_400(self):
        """Test creating a task with blank title returns 400 Bad Request."""
        payload = {"title": "   "}
        response = self.client_a.post(self.list_url, payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("title", response.data)

    def test_create_task_with_null_due_date_succeeds(self):
        """Test creating a task with dueDate: null succeeds."""
        payload = {
            "title": "Task with null due date",
            "dueDate": None,
        }
        response = self.client_a.post(self.list_url, payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIsNone(response.data["dueDate"])
