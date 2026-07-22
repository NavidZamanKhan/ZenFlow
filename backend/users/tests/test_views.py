from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.contrib.auth.hashers import make_password
from django.test import TestCase
from django.utils import timezone
from datetime import timedelta
from rest_framework import status
from rest_framework.test import APIClient

from users.models import PendingRegistration

User = get_user_model()


class RegisterViewTests(TestCase):
    """Tests for POST /api/auth/register/."""

    def setUp(self):
        self.client = APIClient()
        self.url = "/api/auth/register/"

    @patch("users.services.auth_service.get_email_service")
    def test_register_success(self, mock_email_factory):
        """Test successful registration returns 201."""
        mock_email_service = mock_email_factory.return_value
        mock_email_service.send_verification_email.return_value = None

        response = self.client.post(
            self.url,
            {
                "full_name": "Test User",
                "email": "test@example.com",
                "password": "TestPass1!",
                "confirm_password": "TestPass1!",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIn("pending_registration_id", response.data)

    def test_register_passwords_dont_match(self):
        """Test registration with mismatched passwords returns 400."""
        response = self.client.post(
            self.url,
            {
                "full_name": "Test User",
                "email": "test@example.com",
                "password": "TestPass1!",
                "confirm_password": "DifferentPass1!",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_register_weak_password(self):
        """Test registration with weak password returns 400."""
        response = self.client.post(
            self.url,
            {
                "full_name": "Test User",
                "email": "test@example.com",
                "password": "weak",
                "confirm_password": "weak",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_register_missing_fields(self):
        """Test registration with missing fields returns 400."""
        response = self.client.post(
            self.url,
            {"email": "test@example.com"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_register_invalid_email(self):
        """Test registration with invalid email returns 400."""
        response = self.client.post(
            self.url,
            {
                "full_name": "Test User",
                "email": "not-an-email",
                "password": "TestPass1!",
                "confirm_password": "TestPass1!",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)


class VerifyEmailViewTests(TestCase):
    """Tests for POST /api/auth/verify-email/."""

    def setUp(self):
        self.client = APIClient()
        self.url = "/api/auth/verify-email/"

    def _create_pending(self, otp="123456"):
        """Helper to create a PendingRegistration with a known OTP."""
        return PendingRegistration.objects.create(
            full_name="Test User",
            email="test@example.com",
            hashed_password=make_password("TestPass1!"),
            otp_hash=make_password(otp),
            otp_expires_at=timezone.now() + timedelta(minutes=5),
            resend_available_at=timezone.now(),
        )

    def test_verify_email_success(self):
        """Test successful verification returns 200 with tokens."""
        pending = self._create_pending(otp="123456")

        response = self.client.post(
            self.url,
            {
                "pending_registration_id": str(pending.id),
                "otp": "123456",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("tokens", response.data)
        self.assertIn("user", response.data)

    def test_verify_email_wrong_otp(self):
        """Test wrong OTP returns 400."""
        pending = self._create_pending(otp="123456")

        response = self.client.post(
            self.url,
            {
                "pending_registration_id": str(pending.id),
                "otp": "654321",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_verify_email_non_numeric_otp(self):
        """Test non-numeric OTP returns 400."""
        pending = self._create_pending()

        response = self.client.post(
            self.url,
            {
                "pending_registration_id": str(pending.id),
                "otp": "abcdef",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)


class LoginViewTests(TestCase):
    """Tests for POST /api/auth/login/."""

    def setUp(self):
        self.client = APIClient()
        self.url = "/api/auth/login/"
        self.user = User.objects.create_user(
            email="test@example.com",
            full_name="Test User",
            password="TestPass1!",
        )

    def test_login_success(self):
        """Test successful login returns 200 with tokens."""
        response = self.client.post(
            self.url,
            {
                "email": "test@example.com",
                "password": "TestPass1!",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("tokens", response.data)
        self.assertIn("user", response.data)

    def test_login_wrong_password(self):
        """Test login with wrong password returns 401."""
        response = self.client.post(
            self.url,
            {
                "email": "test@example.com",
                "password": "WrongPass1!",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_login_nonexistent_email(self):
        """Test login with nonexistent email returns 401."""
        response = self.client.post(
            self.url,
            {
                "email": "nonexistent@example.com",
                "password": "TestPass1!",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)


class LogoutViewTests(TestCase):
    """Tests for POST /api/auth/logout/."""

    def setUp(self):
        self.client = APIClient()
        self.url = "/api/auth/logout/"
        self.user = User.objects.create_user(
            email="test@example.com",
            full_name="Test User",
            password="TestPass1!",
        )

    def test_logout_success(self):
        """Test successful logout blacklists the refresh token."""
        # Login first
        login_response = self.client.post(
            "/api/auth/login/",
            {"email": "test@example.com", "password": "TestPass1!"},
            format="json",
        )
        tokens = login_response.data["tokens"]

        # Set auth header
        self.client.credentials(
            HTTP_AUTHORIZATION=f"Bearer {tokens['access']}"
        )

        response = self.client.post(
            self.url,
            {"refresh": tokens["refresh"]},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_logout_unauthenticated(self):
        """Test logout without authentication returns 401."""
        response = self.client.post(
            self.url,
            {"refresh": "some-token"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)


class MeViewTests(TestCase):
    """Tests for GET /api/auth/me/."""

    def setUp(self):
        self.client = APIClient()
        self.url = "/api/auth/me/"
        self.user = User.objects.create_user(
            email="test@example.com",
            full_name="Test User",
            password="TestPass1!",
        )

    def test_me_authenticated(self):
        """Test /me returns current user when authenticated."""
        # Login
        login_response = self.client.post(
            "/api/auth/login/",
            {"email": "test@example.com", "password": "TestPass1!"},
            format="json",
        )
        access_token = login_response.data["tokens"]["access"]

        self.client.credentials(
            HTTP_AUTHORIZATION=f"Bearer {access_token}"
        )

        response = self.client.get(self.url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["email"], "test@example.com")
        self.assertEqual(response.data["full_name"], "Test User")

    def test_me_unauthenticated(self):
        """Test /me returns 401 when not authenticated."""
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
