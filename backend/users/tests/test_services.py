from datetime import timedelta
from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.contrib.auth.hashers import check_password, make_password
from django.core.exceptions import ValidationError
from django.test import TestCase
from django.utils import timezone

from users.models import PendingRegistration
from users.services.auth_service import AuthService
from users.services.otp_service import OTPService

User = get_user_model()


class OTPServiceTests(TestCase):
    """Tests for the OTP service."""

    def test_generate_otp_is_six_digits(self):
        """Test that generated OTP is a 6-digit numeric string."""
        otp = OTPService.generate_otp()
        self.assertEqual(len(otp), 6)
        self.assertTrue(otp.isdigit())

    def test_generate_otp_is_random(self):
        """Test that successive OTPs are different (probabilistic)."""
        otps = {OTPService.generate_otp() for _ in range(100)}
        # With 100 generations, we should get multiple unique values
        self.assertGreater(len(otps), 1)

    def test_hash_and_verify_otp(self):
        """Test that hashing and verifying OTP works correctly."""
        otp = "123456"
        hashed = OTPService.hash_otp(otp)
        self.assertTrue(OTPService.verify_otp("123456", hashed))
        self.assertFalse(OTPService.verify_otp("654321", hashed))

    def test_is_expired(self):
        """Test OTP expiry check."""
        past = timezone.now() - timedelta(minutes=1)
        future = timezone.now() + timedelta(minutes=5)
        self.assertTrue(OTPService.is_expired(past))
        self.assertFalse(OTPService.is_expired(future))

    def test_can_resend(self):
        """Test resend cooldown check."""
        past = timezone.now() - timedelta(seconds=1)
        future = timezone.now() + timedelta(seconds=30)
        self.assertTrue(OTPService.can_resend(past))
        self.assertFalse(OTPService.can_resend(future))

    def test_has_exceeded_max_attempts(self):
        """Test max failed attempts check."""
        self.assertFalse(OTPService.has_exceeded_max_attempts(4))
        self.assertTrue(OTPService.has_exceeded_max_attempts(5))
        self.assertTrue(OTPService.has_exceeded_max_attempts(6))


class AuthServiceRegistrationTests(TestCase):
    """Tests for AuthService.register()."""

    def setUp(self):
        self.service = AuthService()

    @patch("users.services.auth_service.get_email_service")
    def test_register_creates_pending_registration(self, mock_email_factory):
        """Test that registration creates a PendingRegistration record."""
        mock_email_service = mock_email_factory.return_value
        mock_email_service.send_verification_email.return_value = None

        result = self.service.register(
            full_name="Test User",
            email="test@example.com",
            password="TestPass1!",
        )

        self.assertIn("pending_registration_id", result)
        self.assertTrue(
            PendingRegistration.objects.filter(email="test@example.com").exists()
        )

    @patch("users.services.auth_service.get_email_service")
    def test_register_normalizes_email(self, mock_email_factory):
        """Test that registration normalizes email."""
        mock_email_service = mock_email_factory.return_value
        mock_email_service.send_verification_email.return_value = None

        self.service.register(
            full_name="Test User",
            email="  TEST@EXAMPLE.COM  ",
            password="TestPass1!",
        )

        self.assertTrue(
            PendingRegistration.objects.filter(email="test@example.com").exists()
        )

    @patch("users.services.auth_service.get_email_service")
    def test_register_existing_user_returns_generic_response(self, mock_email_factory):
        """Test that registering with an existing email doesn't reveal the user exists."""
        User.objects.create_user(
            email="existing@example.com",
            full_name="Existing User",
            password="ExistPass1!",
        )

        result = self.service.register(
            full_name="New User",
            email="existing@example.com",
            password="NewPass1!",
        )

        # Should return generic message without pending_registration_id
        self.assertIn("message", result)
        self.assertNotIn("pending_registration_id", result)

    @patch("users.services.auth_service.get_email_service")
    def test_register_upserts_pending_registration(self, mock_email_factory):
        """Test that re-registering same email upserts the PendingRegistration."""
        mock_email_service = mock_email_factory.return_value
        mock_email_service.send_verification_email.return_value = None

        self.service.register(
            full_name="First Attempt",
            email="test@example.com",
            password="TestPass1!",
        )
        self.service.register(
            full_name="Second Attempt",
            email="test@example.com",
            password="TestPass1!",
        )

        # Should still be only one PendingRegistration
        self.assertEqual(
            PendingRegistration.objects.filter(email="test@example.com").count(), 1
        )
        pending = PendingRegistration.objects.get(email="test@example.com")
        self.assertEqual(pending.full_name, "Second Attempt")


class AuthServiceVerifyEmailTests(TestCase):
    """Tests for AuthService.verify_email()."""

    def setUp(self):
        self.service = AuthService()

    def _create_pending(self, otp="123456", expired=False, failed_attempts=0):
        """Helper to create a PendingRegistration with a known OTP."""
        otp_hash = make_password(otp)
        if expired:
            otp_expires_at = timezone.now() - timedelta(minutes=1)
        else:
            otp_expires_at = timezone.now() + timedelta(minutes=5)

        return PendingRegistration.objects.create(
            full_name="Test User",
            email="test@example.com",
            hashed_password=make_password("TestPass1!"),
            otp_hash=otp_hash,
            otp_expires_at=otp_expires_at,
            resend_available_at=timezone.now(),
            failed_attempts=failed_attempts,
        )

    def test_verify_email_success(self):
        """Test successful email verification creates user and returns tokens."""
        pending = self._create_pending(otp="123456")

        result = self.service.verify_email(
            pending_registration_id=str(pending.id),
            otp="123456",
        )

        self.assertIn("tokens", result)
        self.assertIn("access", result["tokens"])
        self.assertIn("refresh", result["tokens"])
        self.assertIn("user", result)
        self.assertEqual(result["user"]["email"], "test@example.com")
        self.assertTrue(result["user"]["email_verified"])

        # User should exist now
        self.assertTrue(User.objects.filter(email="test@example.com").exists())
        # PendingRegistration should be deleted
        self.assertFalse(PendingRegistration.objects.filter(id=pending.id).exists())

    def test_verify_email_wrong_otp(self):
        """Test that wrong OTP increments failed attempts."""
        pending = self._create_pending(otp="123456")

        with self.assertRaises(ValidationError):
            self.service.verify_email(
                pending_registration_id=str(pending.id),
                otp="654321",
            )

        pending.refresh_from_db()
        self.assertEqual(pending.failed_attempts, 1)

    def test_verify_email_expired_otp(self):
        """Test that expired OTP raises an error."""
        pending = self._create_pending(otp="123456", expired=True)

        with self.assertRaises(ValidationError):
            self.service.verify_email(
                pending_registration_id=str(pending.id),
                otp="123456",
            )

    def test_verify_email_max_attempts_exceeded(self):
        """Test that exceeding max attempts deletes the PendingRegistration."""
        pending = self._create_pending(otp="123456", failed_attempts=5)

        with self.assertRaises(ValidationError):
            self.service.verify_email(
                pending_registration_id=str(pending.id),
                otp="123456",
            )

        # PendingRegistration should be deleted
        self.assertFalse(PendingRegistration.objects.filter(id=pending.id).exists())

    def test_verify_email_invalid_id(self):
        """Test verification with invalid pending_registration_id."""
        import uuid

        with self.assertRaises(ValidationError):
            self.service.verify_email(
                pending_registration_id=str(uuid.uuid4()),
                otp="123456",
            )


class AuthServiceLoginTests(TestCase):
    """Tests for AuthService.login()."""

    def setUp(self):
        self.service = AuthService()
        self.user = User.objects.create_user(
            email="test@example.com",
            full_name="Test User",
            password="TestPass1!",
        )

    def test_login_success(self):
        """Test successful login returns tokens and user data."""
        result = self.service.login(
            email="test@example.com",
            password="TestPass1!",
        )

        self.assertIn("tokens", result)
        self.assertIn("access", result["tokens"])
        self.assertIn("refresh", result["tokens"])
        self.assertIn("user", result)
        self.assertEqual(result["user"]["email"], "test@example.com")

    def test_login_normalizes_email(self):
        """Test that login normalizes email."""
        result = self.service.login(
            email="  TEST@EXAMPLE.COM  ",
            password="TestPass1!",
        )

        self.assertIn("tokens", result)

    def test_login_wrong_password(self):
        """Test login with wrong password raises error."""
        with self.assertRaises(ValidationError):
            self.service.login(
                email="test@example.com",
                password="WrongPass1!",
            )

    def test_login_nonexistent_email(self):
        """Test login with nonexistent email raises error."""
        with self.assertRaises(ValidationError):
            self.service.login(
                email="nonexistent@example.com",
                password="TestPass1!",
            )

    def test_login_inactive_user(self):
        """Test login with inactive user raises error."""
        self.user.is_active = False
        self.user.save()

        with self.assertRaises(ValidationError):
            self.service.login(
                email="test@example.com",
                password="TestPass1!",
            )


class AuthServiceLogoutTests(TestCase):
    """Tests for AuthService.logout()."""

    def setUp(self):
        self.service = AuthService()
        self.user = User.objects.create_user(
            email="test@example.com",
            full_name="Test User",
            password="TestPass1!",
        )

    def test_logout_blacklists_token(self):
        """Test that logout blacklists the refresh token."""
        login_result = self.service.login(
            email="test@example.com",
            password="TestPass1!",
        )
        refresh_token = login_result["tokens"]["refresh"]

        result = self.service.logout(refresh_token)
        self.assertIn("detail", result)

    def test_logout_invalid_token(self):
        """Test logout with invalid token raises error."""
        with self.assertRaises(ValidationError):
            self.service.logout("invalid-token")
