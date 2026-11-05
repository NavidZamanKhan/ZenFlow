from unittest.mock import patch

from django.conf import settings
from django.contrib.auth import get_user_model
from django.contrib.auth.hashers import make_password
from django.test import TestCase, override_settings
from django.utils import timezone
from datetime import timedelta
from rest_framework import status
from rest_framework.test import APIClient

from users.models import PendingRegistration

User = get_user_model()


def assert_session_cookies(testcase, response):
    """Assert a response established the httpOnly JWT cookie session."""
    access = response.cookies.get(settings.JWT_AUTH_COOKIE)
    refresh = response.cookies.get(settings.JWT_AUTH_REFRESH_COOKIE)
    testcase.assertIsNotNone(access, "access cookie missing")
    testcase.assertIsNotNone(refresh, "refresh cookie missing")
    testcase.assertTrue(access.value)
    testcase.assertTrue(refresh.value)
    testcase.assertTrue(access["httponly"])
    testcase.assertTrue(refresh["httponly"])
    testcase.assertEqual(refresh["path"], settings.JWT_AUTH_REFRESH_COOKIE_PATH)
    # Tokens must never be echoed in the body.
    testcase.assertNotIn("tokens", response.data)
    testcase.assertIn("csrfToken", response.data)


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
        """Test successful verification returns 200, sets JWT cookies, and returns the user."""
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
        assert_session_cookies(self, response)
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

    @override_settings(GOOGLE_CLIENT_ID="test-client-id.apps.googleusercontent.com")
    @patch("users.services.auth_service.google_id_token.verify_oauth2_token")
    def test_verify_email_after_google_signup_with_same_email_is_a_clean_400(self, mock_verify):
        """
        Regression: start an email registration, sign in with Google for the
        same address, then complete the OTP. Previously the second User insert
        hit the unique constraint and surfaced as a 500.
        """
        pending = self._create_pending(otp="123456")
        mock_verify.return_value = {
            "iss": "accounts.google.com",
            "email": "test@example.com",
            "email_verified": True,
            "name": "Test User",
        }
        google = APIClient().post("/api/auth/google/", {"id_token": "t"}, format="json")
        self.assertEqual(google.status_code, status.HTTP_200_OK)

        response = self.client.post(
            self.url,
            {"pending_registration_id": str(pending.id), "otp": "123456"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("already exists", str(response.data))
        self.assertNotIn(settings.JWT_AUTH_COOKIE, response.cookies)
        self.assertFalse(PendingRegistration.objects.filter(pk=pending.pk).exists())
        # Exactly one account, still the Google-created one.
        self.assertEqual(User.objects.filter(email="test@example.com").count(), 1)
        self.assertFalse(User.objects.get(email="test@example.com").has_usable_password())

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
        """Test successful login returns 200, sets JWT cookies, and returns the user."""
        response = self.client.post(
            self.url,
            {
                "email": "test@example.com",
                "password": "TestPass1!",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        assert_session_cookies(self, response)
        self.assertIn("user", response.data)
        self.assertEqual(response.data["user"]["email"], "test@example.com")

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

    def test_deactivated_account_login_returns_generic_error(self):
        """Test login with deactivated account returns generic 401 to prevent account enumeration."""
        self.user.is_active = False
        self.user.save(update_fields=["is_active"])

        response = self.client.post(
            self.url,
            {
                "email": "test@example.com",
                "password": "TestPass1!",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertIn("Invalid email or password.", str(response.data))
        self.assertNotIn("deactivated", str(response.data).lower())


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
        """Test logout via cookies blacklists the refresh token and expires both cookies."""
        # Login first - the test client keeps the cookies the server set.
        login_response = self.client.post(
            "/api/auth/login/",
            {"email": "test@example.com", "password": "TestPass1!"},
            format="json",
        )
        self.assertEqual(login_response.status_code, status.HTTP_200_OK)
        refresh_value = login_response.cookies[settings.JWT_AUTH_REFRESH_COOKIE].value

        response = self.client.post(self.url, {}, format="json")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # Both cookies are expired on the client.
        self.assertEqual(response.cookies[settings.JWT_AUTH_COOKIE].value, "")
        self.assertEqual(response.cookies[settings.JWT_AUTH_REFRESH_COOKIE].value, "")

        # The old refresh token can no longer be used.
        refresh_response = APIClient().post(
            "/api/auth/refresh/", {"refresh": refresh_value}, format="json"
        )
        self.assertEqual(refresh_response.status_code, status.HTTP_401_UNAUTHORIZED)

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
        """Test /me returns current user when authenticated via the access cookie."""
        login_response = self.client.post(
            "/api/auth/login/",
            {"email": "test@example.com", "password": "TestPass1!"},
            format="json",
        )
        self.assertEqual(login_response.status_code, status.HTTP_200_OK)

        # No Authorization header - the httpOnly cookie alone authenticates.
        response = self.client.get(self.url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["email"], "test@example.com")
        self.assertEqual(response.data["full_name"], "Test User")

    def test_me_unauthenticated(self):
        """Test /me returns 401 when not authenticated."""
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_me_patch_full_name_success(self):
        """Test PATCH /me updates full_name in database."""
        self.client.force_authenticate(user=self.user)
        response = self.client.patch(
            self.url,
            {"full_name": "Navid Zaman Khan"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["full_name"], "Navid Zaman Khan")
        self.user.refresh_from_db()
        self.assertEqual(self.user.full_name, "Navid Zaman Khan")

    def test_me_patch_avatar_success(self):
        """Test PATCH /me updates avatar image."""
        import io
        from PIL import Image
        from django.core.files.uploadedfile import SimpleUploadedFile

        image = Image.new("RGB", (100, 100), color="blue")
        image_bytes = io.BytesIO()
        image.save(image_bytes, format="JPEG")
        image_bytes.seek(0)

        uploaded_file = SimpleUploadedFile(
            "test_avatar.jpg",
            image_bytes.read(),
            content_type="image/jpeg",
        )

        self.client.force_authenticate(user=self.user)
        response = self.client.patch(
            self.url,
            {"avatar": uploaded_file},
            format="multipart",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.user.refresh_from_db()
        self.assertTrue(bool(self.user.avatar))
        self.assertIsNotNone(response.data["avatar_url"])


@override_settings(GOOGLE_CLIENT_ID="test-client-id.apps.googleusercontent.com")
class GoogleAuthViewTests(TestCase):
    """Tests for POST /api/auth/google/ (detailed security cases live in test_google_auth.py)."""

    def setUp(self):
        self.client = APIClient()
        self.url = "/api/auth/google/"

    @patch("users.services.auth_service.google_id_token.verify_oauth2_token")
    def test_google_auth_new_user_success(self, mock_verify):
        """Test Google login creates new user and returns JWT tokens."""
        mock_verify.return_value = {
            "iss": "https://accounts.google.com",
            "email": "newgoogle@example.com",
            "email_verified": True,
            "name": "Google User",
        }

        response = self.client.post(
            self.url,
            {"id_token": "valid-google-id-token"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        assert_session_cookies(self, response)
        self.assertEqual(response.data["user"]["email"], "newgoogle@example.com")
        self.assertEqual(response.data["user"]["full_name"], "Google User")
        self.assertTrue(response.data["user"]["email_verified"])

        user = User.objects.get(email="newgoogle@example.com")
        self.assertTrue(user.email_verified)
        self.assertFalse(user.has_usable_password())

    @patch("users.services.auth_service.google_id_token.verify_oauth2_token")
    def test_google_auth_existing_user_success(self, mock_verify):
        """Test Google login for existing user returns tokens and verifies email."""
        User.objects.create_user(
            email="existing@example.com",
            full_name="Existing User",
            password="Password1!",
        )

        mock_verify.return_value = {
            "iss": "accounts.google.com",
            "email": "existing@example.com",
            "email_verified": True,
            "name": "Existing User",
        }

        response = self.client.post(
            self.url,
            {"id_token": "valid-google-id-token"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        assert_session_cookies(self, response)
        self.assertEqual(response.data["user"]["email"], "existing@example.com")

        user = User.objects.get(email="existing@example.com")
        self.assertTrue(user.email_verified)

    @patch("users.services.auth_service.google_id_token.verify_oauth2_token")
    def test_google_auth_invalid_token(self, mock_verify):
        """Test Google login with invalid token returns 400."""
        mock_verify.side_effect = ValueError("Invalid token")

        response = self.client.post(
            self.url,
            {"id_token": "bad-token"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_google_auth_missing_token(self):
        """Test Google login without id_token returns 400."""
        response = self.client.post(self.url, {}, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
