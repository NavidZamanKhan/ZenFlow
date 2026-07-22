from django.contrib.auth import get_user_model
from django.test import TestCase

from users.models import PendingRegistration

User = get_user_model()


class UserModelTests(TestCase):
    """Tests for the custom User model."""

    def test_create_user_with_email(self):
        """Test creating a user with email and full name."""
        user = User.objects.create_user(
            email="test@example.com",
            full_name="Test User",
            password="TestPass1!",
        )
        self.assertEqual(user.email, "test@example.com")
        self.assertEqual(user.full_name, "Test User")
        self.assertTrue(user.is_active)
        self.assertFalse(user.is_staff)
        self.assertFalse(user.is_superuser)
        self.assertFalse(user.email_verified)
        self.assertTrue(user.check_password("TestPass1!"))

    def test_create_user_normalizes_email(self):
        """Test that email is lowercased and stripped."""
        user = User.objects.create_user(
            email="  Test@EXAMPLE.com  ",
            full_name="Test User",
            password="TestPass1!",
        )
        self.assertEqual(user.email, "test@example.com")

    def test_create_user_without_email_raises(self):
        """Test that creating a user without email raises ValueError."""
        with self.assertRaises(ValueError):
            User.objects.create_user(
                email="",
                full_name="Test User",
                password="TestPass1!",
            )

    def test_create_user_without_full_name_raises(self):
        """Test that creating a user without full_name raises ValueError."""
        with self.assertRaises(ValueError):
            User.objects.create_user(
                email="test@example.com",
                full_name="",
                password="TestPass1!",
            )

    def test_create_superuser(self):
        """Test creating a superuser."""
        user = User.objects.create_superuser(
            email="admin@example.com",
            full_name="Admin User",
            password="AdminPass1!",
        )
        self.assertTrue(user.is_staff)
        self.assertTrue(user.is_superuser)
        self.assertTrue(user.is_active)
        self.assertTrue(user.email_verified)

    def test_create_superuser_without_is_staff_raises(self):
        """Test superuser must have is_staff=True."""
        with self.assertRaises(ValueError):
            User.objects.create_superuser(
                email="admin@example.com",
                full_name="Admin User",
                password="AdminPass1!",
                is_staff=False,
            )

    def test_create_superuser_without_is_superuser_raises(self):
        """Test superuser must have is_superuser=True."""
        with self.assertRaises(ValueError):
            User.objects.create_superuser(
                email="admin@example.com",
                full_name="Admin User",
                password="AdminPass1!",
                is_superuser=False,
            )

    def test_user_str_returns_email(self):
        """Test the string representation of a user."""
        user = User.objects.create_user(
            email="test@example.com",
            full_name="Test User",
            password="TestPass1!",
        )
        self.assertEqual(str(user), "test@example.com")

    def test_user_uuid_primary_key(self):
        """Test that the user has a UUID primary key."""
        user = User.objects.create_user(
            email="test@example.com",
            full_name="Test User",
            password="TestPass1!",
        )
        self.assertIsNotNone(user.id)
        # UUID string should be 36 characters with hyphens
        self.assertEqual(len(str(user.id)), 36)


class PendingRegistrationModelTests(TestCase):
    """Tests for the PendingRegistration model."""

    def test_create_pending_registration(self):
        """Test creating a PendingRegistration record."""
        from django.utils import timezone

        now = timezone.now()
        pending = PendingRegistration.objects.create(
            full_name="Test User",
            email="test@example.com",
            hashed_password="hashed_pw",
            otp_hash="hashed_otp",
            otp_expires_at=now,
            resend_available_at=now,
        )
        self.assertEqual(pending.email, "test@example.com")
        self.assertEqual(pending.failed_attempts, 0)
        self.assertIsNotNone(pending.id)

    def test_pending_registration_str(self):
        """Test string representation."""
        from django.utils import timezone

        now = timezone.now()
        pending = PendingRegistration.objects.create(
            full_name="Test User",
            email="test@example.com",
            hashed_password="hashed_pw",
            otp_hash="hashed_otp",
            otp_expires_at=now,
            resend_available_at=now,
        )
        self.assertEqual(str(pending), "PendingRegistration(test@example.com)")

    def test_email_unique_constraint(self):
        """Test that email must be unique."""
        from django.db import IntegrityError
        from django.utils import timezone

        now = timezone.now()
        PendingRegistration.objects.create(
            full_name="Test User",
            email="test@example.com",
            hashed_password="hashed_pw",
            otp_hash="hashed_otp",
            otp_expires_at=now,
            resend_available_at=now,
        )
        with self.assertRaises(IntegrityError):
            PendingRegistration.objects.create(
                full_name="Another User",
                email="test@example.com",
                hashed_password="hashed_pw2",
                otp_hash="hashed_otp2",
                otp_expires_at=now,
                resend_available_at=now,
            )
