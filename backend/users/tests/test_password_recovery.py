"""
Tests for the public (logged-out) password recovery flow:
POST /api/auth/password/forgot/            -> email a reset link
POST /api/auth/password/forgot/validate/   -> pre-check a link
POST /api/auth/password/forgot/confirm/    -> set a new password
"""

from datetime import datetime, timedelta
from unittest.mock import patch

from django.conf import settings
from django.contrib.auth import get_user_model
from django.contrib.auth.tokens import default_token_generator
from django.core.cache import cache
from django.test import TestCase, override_settings
from django.utils.encoding import force_bytes
from django.utils.http import urlsafe_base64_encode
from rest_framework import status
from rest_framework.test import APIClient
from rest_framework.throttling import ScopedRateThrottle
from rest_framework_simplejwt.tokens import RefreshToken

from users.services.auth_service import AuthService

User = get_user_model()

FORGOT_URL = "/api/auth/password/forgot/"
VALIDATE_URL = "/api/auth/password/forgot/validate/"
CONFIRM_URL = "/api/auth/password/forgot/confirm/"


@override_settings(FRONTEND_URL="https://app.example.test")
class PasswordRecoveryTests(TestCase):
    def setUp(self):
        cache.clear()  # reset throttle counters between tests
        self.client = APIClient()
        self.user = User.objects.create_user(
            email="forgot@example.com",
            full_name="Forgot User",
            password="OldPass1!",
        )

    def _link_for(self, user):
        uid = urlsafe_base64_encode(force_bytes(user.pk))
        token = default_token_generator.make_token(user)
        return uid, token

    @patch("users.services.auth_service.get_email_service")
    def test_forgot_sends_link_for_known_email(self, mock_factory):
        mock_service = mock_factory.return_value
        response = self.client.post(FORGOT_URL, {"email": "FORGOT@example.com "}, format="json")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["message"], AuthService.RECOVERY_GENERIC_MESSAGE)
        mock_service.send_password_recovery_email.assert_called_once()
        kwargs = mock_service.send_password_recovery_email.call_args.kwargs
        self.assertEqual(kwargs["to_email"], "forgot@example.com")
        self.assertTrue(kwargs["reset_url"].startswith("https://app.example.test/reset-password?uid="))
        self.assertIn("&token=", kwargs["reset_url"])

    @patch("users.services.auth_service.get_email_service")
    def test_forgot_is_silent_for_unknown_email(self, mock_factory):
        mock_service = mock_factory.return_value
        response = self.client.post(FORGOT_URL, {"email": "nobody@example.com"}, format="json")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["message"], AuthService.RECOVERY_GENERIC_MESSAGE)
        mock_service.send_password_recovery_email.assert_not_called()

    @patch("users.services.auth_service.get_email_service")
    def test_forgot_is_silent_for_inactive_account(self, mock_factory):
        self.user.is_active = False
        self.user.save(update_fields=["is_active"])
        mock_service = mock_factory.return_value
        response = self.client.post(FORGOT_URL, {"email": "forgot@example.com"}, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        mock_service.send_password_recovery_email.assert_not_called()

    def test_forgot_rejects_invalid_email(self):
        response = self.client.post(FORGOT_URL, {"email": "not-an-email"}, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_validate_accepts_fresh_link(self):
        uid, token = self._link_for(self.user)
        response = self.client.post(VALIDATE_URL, {"uid": uid, "token": token}, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data["valid"])
        self.assertEqual(response.data["email"], "forgot@example.com")

    def test_validate_rejects_bad_token_and_bad_uid(self):
        uid, _ = self._link_for(self.user)
        bad_token = self.client.post(VALIDATE_URL, {"uid": uid, "token": "abc-def"}, format="json")
        self.assertEqual(bad_token.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertFalse(bad_token.data["valid"])

        _, token = self._link_for(self.user)
        bad_uid = self.client.post(VALIDATE_URL, {"uid": "!!!", "token": token}, format="json")
        self.assertEqual(bad_uid.status_code, status.HTTP_400_BAD_REQUEST)

    def test_confirm_resets_password_and_revokes_sessions(self):
        # An existing session that must die with the old password.
        old_refresh = RefreshToken.for_user(self.user)
        uid, token = self._link_for(self.user)

        response = self.client.post(
            CONFIRM_URL,
            {
                "uid": uid,
                "token": token,
                "new_password": "BrandNewPass1!",
                "confirm_password": "BrandNewPass1!",
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        self.user.refresh_from_db()
        self.assertTrue(self.user.check_password("BrandNewPass1!"))
        self.assertFalse(self.user.check_password("OldPass1!"))

        # Old refresh token is blacklisted.
        replay = APIClient().post("/api/auth/refresh/", {"refresh": str(old_refresh)}, format="json")
        self.assertEqual(replay.status_code, status.HTTP_401_UNAUTHORIZED)

        # Login works with the new password.
        login = APIClient().post(
            "/api/auth/login/",
            {"email": "forgot@example.com", "password": "BrandNewPass1!"},
            format="json",
        )
        self.assertEqual(login.status_code, status.HTTP_200_OK)

    def test_confirm_link_is_single_use(self):
        uid, token = self._link_for(self.user)
        payload = {
            "uid": uid,
            "token": token,
            "new_password": "BrandNewPass1!",
            "confirm_password": "BrandNewPass1!",
        }
        first = self.client.post(CONFIRM_URL, payload, format="json")
        self.assertEqual(first.status_code, status.HTTP_200_OK)

        second = self.client.post(CONFIRM_URL, payload, format="json")
        self.assertEqual(second.status_code, status.HTTP_400_BAD_REQUEST)

    def test_confirm_rejects_mismatched_and_weak_passwords(self):
        uid, token = self._link_for(self.user)
        mismatch = self.client.post(
            CONFIRM_URL,
            {"uid": uid, "token": token, "new_password": "BrandNewPass1!", "confirm_password": "Other1!!"},
            format="json",
        )
        self.assertEqual(mismatch.status_code, status.HTTP_400_BAD_REQUEST)

        weak = self.client.post(
            CONFIRM_URL,
            {"uid": uid, "token": token, "new_password": "alllowercase", "confirm_password": "alllowercase"},
            format="json",
        )
        self.assertEqual(weak.status_code, status.HTTP_400_BAD_REQUEST)

        self.user.refresh_from_db()
        self.assertTrue(self.user.check_password("OldPass1!"))

    def test_confirm_rejects_invalid_token(self):
        uid, _ = self._link_for(self.user)
        response = self.client.post(
            CONFIRM_URL,
            {"uid": uid, "token": "bogus-token", "new_password": "BrandNewPass1!", "confirm_password": "BrandNewPass1!"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    @patch("users.services.auth_service.get_email_service")
    def test_forgot_is_rate_limited(self, _mock_factory):
        with patch.object(ScopedRateThrottle, "THROTTLE_RATES", {"password_recovery": "2/hour"}):
            for _ in range(2):
                ok = self.client.post(FORGOT_URL, {"email": "forgot@example.com"}, format="json")
                self.assertEqual(ok.status_code, status.HTTP_200_OK)
            throttled = self.client.post(FORGOT_URL, {"email": "forgot@example.com"}, format="json")
            self.assertEqual(throttled.status_code, status.HTTP_429_TOO_MANY_REQUESTS)

    def test_validate_shares_the_recovery_rate_limit(self):
        uid, token = self._link_for(self.user)
        with patch.object(ScopedRateThrottle, "THROTTLE_RATES", {"password_recovery": "2/hour"}):
            for _ in range(2):
                ok = self.client.post(VALIDATE_URL, {"uid": uid, "token": token}, format="json")
                self.assertEqual(ok.status_code, status.HTTP_200_OK)
            throttled = self.client.post(VALIDATE_URL, {"uid": uid, "token": token}, format="json")
            self.assertEqual(throttled.status_code, status.HTTP_429_TOO_MANY_REQUESTS)


@override_settings(FRONTEND_URL="https://app.example.test")
class PasswordRecoveryHardeningTests(TestCase):
    """Anti-enumeration, token lifecycle and session-revocation guarantees."""

    def setUp(self):
        cache.clear()
        self.client = APIClient()
        self.user = User.objects.create_user(
            email="forgot@example.com", full_name="Forgot User", password="OldPass1!"
        )

    def _link_for(self, user):
        return urlsafe_base64_encode(force_bytes(user.pk)), default_token_generator.make_token(user)

    def _confirm(self, uid, token, password="BrandNewPass1!", client=None):
        return (client or self.client).post(
            CONFIRM_URL,
            {"uid": uid, "token": token, "new_password": password, "confirm_password": password},
            format="json",
        )

    # -- enumeration resistance ----------------------------------------

    @patch("users.services.auth_service.get_email_service")
    def test_known_and_unknown_emails_get_identical_responses(self, _mock_factory):
        known = self.client.post(FORGOT_URL, {"email": "forgot@example.com"}, format="json")
        unknown = self.client.post(FORGOT_URL, {"email": "nobody@example.com"}, format="json")
        self.assertEqual(known.status_code, unknown.status_code)
        self.assertEqual(known.data, unknown.data)
        self.assertEqual(known.data, {"message": AuthService.RECOVERY_GENERIC_MESSAGE})

    @patch("users.services.auth_service.get_email_service")
    def test_mail_transport_failure_does_not_reveal_account_existence(self, mock_factory):
        mock_factory.return_value.send_password_recovery_email.side_effect = RuntimeError(
            "SMTP 535 authentication failed"
        )
        with self.assertLogs("users.services.auth_service", level="ERROR") as logs:
            known = self.client.post(FORGOT_URL, {"email": "forgot@example.com"}, format="json")
        unknown = self.client.post(FORGOT_URL, {"email": "nobody@example.com"}, format="json")

        self.assertEqual(known.status_code, status.HTTP_200_OK)
        self.assertEqual(known.data, unknown.data)
        # Provider error text never reaches the client...
        self.assertNotIn("SMTP", str(known.data))
        # ...but operators do get a log line, without the reset token in it.
        joined = "\n".join(logs.output)
        self.assertIn("Failed to send password recovery email", joined)
        self.assertNotIn("token=", joined)

    @patch("users.services.auth_service.get_email_service")
    def test_unknown_email_is_not_logged_at_info_level(self, _mock_factory):
        logger = "users.services.auth_service"
        with self.assertNoLogs(logger, level="INFO"):
            self.client.post(FORGOT_URL, {"email": "nobody@example.com"}, format="json")

    # -- token lifecycle -----------------------------------------------

    def test_fresh_token_is_accepted(self):
        uid, token = self._link_for(self.user)
        self.assertEqual(self._confirm(uid, token).status_code, status.HTTP_200_OK)

    def test_expired_token_is_rejected(self):
        uid, token = self._link_for(self.user)
        later = datetime.now() + timedelta(seconds=settings.PASSWORD_RESET_TIMEOUT + 60)
        with patch.object(default_token_generator, "_now", return_value=later):
            validate = self.client.post(VALIDATE_URL, {"uid": uid, "token": token}, format="json")
            confirm = self._confirm(uid, token)
        self.assertEqual(validate.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(confirm.status_code, status.HTTP_400_BAD_REQUEST)
        self.user.refresh_from_db()
        self.assertTrue(self.user.check_password("OldPass1!"))

    def test_tampered_token_and_swapped_uid_are_rejected(self):
        other = User.objects.create_user(email="other@example.com", full_name="O", password="OtherPass1!")
        uid, token = self._link_for(self.user)

        flipped = token[:-1] + ("a" if token[-1] != "a" else "b")
        self.assertEqual(self._confirm(uid, flipped).status_code, status.HTTP_400_BAD_REQUEST)

        other_uid = urlsafe_base64_encode(force_bytes(other.pk))
        self.assertEqual(self._confirm(other_uid, token).status_code, status.HTTP_400_BAD_REQUEST)
        other.refresh_from_db()
        self.assertTrue(other.check_password("OtherPass1!"))

    def test_token_cannot_be_reused_after_successful_reset(self):
        uid, token = self._link_for(self.user)
        self.assertEqual(self._confirm(uid, token).status_code, status.HTTP_200_OK)
        self.assertEqual(self._confirm(uid, token, "AnotherPass1!").status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(
            self.client.post(VALIDATE_URL, {"uid": uid, "token": token}, format="json").status_code,
            status.HTTP_400_BAD_REQUEST,
        )

    def test_older_link_remains_valid_until_any_link_is_used(self):
        """
        Django's stateless token design: every link issued within the timeout
        stays valid until the password hash changes. Issuing a newer link does
        not revoke an older one; using *any* link revokes all of them.
        """
        uid, older = self._link_for(self.user)
        with patch.object(default_token_generator, "_now", return_value=datetime.now() + timedelta(seconds=5)):
            newer = default_token_generator.make_token(self.user)
        self.assertNotEqual(older, newer)

        self.assertEqual(
            self.client.post(VALIDATE_URL, {"uid": uid, "token": older}, format="json").status_code,
            status.HTTP_200_OK,
        )
        self.assertEqual(self._confirm(uid, newer).status_code, status.HTTP_200_OK)
        self.assertEqual(self._confirm(uid, older, "AnotherPass1!").status_code, status.HTTP_400_BAD_REQUEST)

    @patch("users.services.auth_service.get_email_service")
    def test_google_only_account_gains_a_password_through_recovery(self, mock_factory):
        google_user = User.objects.create_user(email="g@example.com", full_name="G")
        google_user.set_unusable_password()
        google_user.save()

        response = self.client.post(FORGOT_URL, {"email": "g@example.com"}, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        mock_factory.return_value.send_password_recovery_email.assert_called_once()

        uid, token = self._link_for(google_user)
        self.assertEqual(self._confirm(uid, token).status_code, status.HTTP_200_OK)
        google_user.refresh_from_db()
        self.assertTrue(google_user.has_usable_password())
        login = APIClient().post(
            "/api/auth/login/", {"email": "g@example.com", "password": "BrandNewPass1!"}, format="json"
        )
        self.assertEqual(login.status_code, status.HTTP_200_OK)

    def test_password_is_hashed_and_validated_with_django_validators(self):
        uid, token = self._link_for(self.user)
        # Passes the regex rules but is too similar to the email -> Django validator rejects.
        similar = self._confirm(uid, token, "Forgot@example.com1!")
        self.assertEqual(similar.status_code, status.HTTP_400_BAD_REQUEST)

        ok = self._confirm(uid, token)
        self.assertEqual(ok.status_code, status.HTTP_200_OK)
        self.user.refresh_from_db()
        self.assertTrue(self.user.password.startswith("argon2$"))
        self.assertNotIn("BrandNewPass1!", self.user.password)

    # -- session revocation --------------------------------------------

    def test_reset_revokes_original_and_rotated_refresh_tokens_everywhere(self):
        device_a = APIClient()
        device_b = APIClient()
        for device in (device_a, device_b):
            login = device.post(
                "/api/auth/login/", {"email": "forgot@example.com", "password": "OldPass1!"}, format="json"
            )
            self.assertEqual(login.status_code, status.HTTP_200_OK)
        # Device A rotates its refresh token before the reset.
        self.assertEqual(device_a.post("/api/auth/refresh/", {}, format="json").status_code, status.HTTP_200_OK)

        uid, token = self._link_for(self.user)
        reset = self._confirm(uid, token, client=device_b)
        self.assertEqual(reset.status_code, status.HTTP_200_OK)
        # The resetting browser is logged out immediately.
        self.assertEqual(reset.cookies[settings.JWT_AUTH_COOKIE].value, "")
        self.assertEqual(reset.cookies[settings.JWT_AUTH_REFRESH_COOKIE].value, "")

        self.assertEqual(device_a.post("/api/auth/refresh/", {}, format="json").status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(device_b.post("/api/auth/refresh/", {}, format="json").status_code, status.HTTP_401_UNAUTHORIZED)
