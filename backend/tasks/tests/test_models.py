import uuid
from datetime import date
from django.contrib.auth import get_user_model
from django.test import TestCase

from tasks.models import Task

User = get_user_model()


class TaskModelTests(TestCase):
    """Unit tests for the Task model."""

    def setUp(self):
        self.user = User.objects.create_user(
            email="testuser@example.com",
            password="TestPassword123!",
            full_name="Test User",
        )

    def test_create_task_all_fields(self):
        """Test creating a task with all fields populated."""
        task = Task.objects.create(
            user=self.user,
            title="Full Task",
            description="Detailed task description",
            due_date=date(2026, 8, 1),
            priority=Task.Priority.HIGH,
            category="Work",
            completed=True,
        )
        self.assertEqual(task.title, "Full Task")
        self.assertEqual(task.description, "Detailed task description")
        self.assertEqual(task.due_date, date(2026, 8, 1))
        self.assertEqual(task.priority, Task.Priority.HIGH)
        self.assertEqual(task.category, "Work")
        self.assertTrue(task.completed)

    def test_create_task_defaults(self):
        """Test task creation defaults when only required fields are provided."""
        task = Task.objects.create(
            user=self.user,
            title="Minimal Task",
        )
        self.assertEqual(task.priority, Task.Priority.MEDIUM)
        self.assertFalse(task.completed)
        self.assertEqual(task.category, "")
        self.assertEqual(task.description, "")

    def test_task_due_date_can_be_null(self):
        """Test that due_date can be explicitly set to None."""
        task = Task.objects.create(
            user=self.user,
            title="Task without due date",
            due_date=None,
        )
        self.assertIsNone(task.due_date)

    def test_task_id_is_uuid(self):
        """Test that task id primary key is a UUID instance."""
        task = Task.objects.create(
            user=self.user,
            title="UUID Task",
        )
        self.assertIsInstance(task.id, uuid.UUID)

    def test_task_str_method(self):
        """Test that __str__ returns the task title."""
        task = Task.objects.create(
            user=self.user,
            title="String Representation Task",
        )
        self.assertEqual(str(task), "String Representation Task")

    def test_user_foreign_key_cascade_delete(self):
        """Test that deleting a User cascades and deletes associated tasks."""
        task = Task.objects.create(
            user=self.user,
            title="Task to be deleted",
        )
        task_id = task.id
        self.assertTrue(Task.objects.filter(id=task_id).exists())

        self.user.delete()
        self.assertFalse(Task.objects.filter(id=task_id).exists())
