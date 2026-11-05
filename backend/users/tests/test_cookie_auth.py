"""
Tests for the httpOnly-cookie JWT session: cookie attributes, cookie-only
authentication, CSRF enforcement on the cookie path, refresh rotation and
logout revocation.
"""

from unittest.mock import patch

from django.conf import settings
from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.test import TestCase, override_settings
from rest_framework import status
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken

from users.models import PendingRegistration

User = get_user_model()

LOGIN_URL = "/api/auth/login/"
GOOGLE_URL = "/api/auth/google/"
VERIFY_EMAIL_URL = "/api/auth/verify-email/"
REFRESH_URL = "/api/auth/refresh/"
LOGOUT_URL = "/api/auth/logout/"
ME_URL = "/api/auth/me/"
CSRF_URL = "/api/auth/csrf/"
TASKS_URL = "/api/tasks/"
OTP_URL = "/api/auth/password/otp/"
CHANGE_URL = "/api/auth/password/reset/"
VERIFY_GOOGLE = "users.services.auth_service.google_id_token.verify_oauth2_token"


class CookieSessionTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            email="cookie@example.com",
            full_name="Cookie User",
            password="TestPass1!",
        )

    def _login(self, client=None):
        """
        Log in the way the browser does: fetch the CSRF cookie/token first and
        echo it in X-CSRFToken (login itself is CSRF-protected against login CSRF).
        """
        client = client or self.client
        csrf_token = client.get(CSRF_URL).data["csrfToken"]
        response = client.post(
            LOGIN_URL,
            {"email": "cookie@example.com", "password": "TestPass1!"},
            format="json",
            HTTP_X_CSRFTOKEN=csrf_token,
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        return response

    def test_login_sets_httponly_cookies_and_omits_tokens_from_body(self):
        response = self._login()
        access = response.cookies[settings.JWT_AUTH_COOKIE]
        refresh = response.cookies[settings.JWT_AUTH_REFRESH_COOKIE]

        self.assertTrue(access["httponly"])
        self.assertTrue(refresh["httponly"])
        self.assertEqual(access["path"], settings.JWT_AUTH_COOKIE_PATH)
        self.assertEqual(refresh["path"], settings.JWT_AUTH_REFRESH_COOKIE_PATH)
        self.assertEqual(
            int(access["max-age"]),
            int(settings.SIMPLE_JWT["ACCESS_TOKEN_LIFETIME"].total_seconds()),
        )
        self.assertNotIn("tokens", response.data)
        self.assertIn("csrfToken", response.data)
        self.assertIn("user", response.data)

    @override_settings(JWT_AUTH_COOKIE_SECURE=True, JWT_AUTH_COOKIE_SAMESITE="None")
    def test_cookies_are_secure_and_samesite_none_in_production_mode(self):
        response = self._login()
        access = response.cookies[settings.JWT_AUTH_COOKIE]
        refresh = response.cookies[settings.JWT_AUTH_REFRESH_COOKIE]
        self.assertTrue(access["secure"])
        self.assertTrue(refresh["secure"])
        self.assertEqual(access["samesite"], "None")
        self.assertEqual(refresh["samesite"], "None")

    def test_access_cookie_alone_authenticates_requests(self):
        self._login()
        self.client.cookies.pop(settings.JWT_AUTH_REFRESH_COOKIE, None)
        response = self.client.get(ME_URL)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["email"], "cookie@example.com")

    def test_bearer_header_still_works(self):
        refresh = RefreshToken.for_user(self.user)
        client = APIClient()
        client.credentials(HTTP_AUTHORIZATION=f"Bearer {refresh.access_token}")
        response = client.get(ME_URL)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_tampered_access_cookie_is_rejected(self):
        self._login()
        self.client.cookies[settings.JWT_AUTH_COOKIE] = "not-a-jwt"
        response = self.client.get(ME_URL)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_csrf_endpoint_returns_token_and_sets_cookie(self):
        response = self.client.get(CSRF_URL)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data["csrfToken"])
        self.assertIn(settings.CSRF_COOKIE_NAME, response.cookies)

    def test_cookie_authenticated_mutation_requires_csrf_header(self):
        """With CSRF checks enforced, a cookie-auth POST without X-CSRFToken is refused."""
        client = APIClient(enforce_csrf_checks=True)
        login = self._login(client)
        csrf_token = login.data["csrfToken"]

        # Missing header -> rejected
        response = client.post(TASKS_URL, {"title": "CSRF test"}, format="json")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertIn("CSRF", str(response.data))

        # Matching header -> accepted
        response = client.post(
            TASKS_URL,
            {"title": "CSRF test"},
            format="json",
            HTTP_X_CSRFTOKEN=csrf_token,
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_cookie_authenticated_safe_methods_do_not_need_csrf(self):
        client = APIClient(enforce_csrf_checks=True)
        self._login(client)
        response = client.get(ME_URL)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_bearer_requests_are_exempt_from_csrf(self):
        client = APIClient(enforce_csrf_checks=True)
        refresh = RefreshToken.for_user(self.user)
        client.credentials(HTTP_AUTHORIZATION=f"Bearer {refresh.access_token}")
        response = client.post(TASKS_URL, {"title": "Bearer task"}, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_refresh_rotates_cookies_and_blacklists_old_refresh_token(self):
        login = self._login()
        old_refresh = login.cookies[settings.JWT_AUTH_REFRESH_COOKIE].value
        old_access = login.cookies[settings.JWT_AUTH_COOKIE].value

        response = self.client.post(REFRESH_URL, {}, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("csrfToken", response.data)
        new_access = response.cookies[settings.JWT_AUTH_COOKIE].value
        new_refresh = response.cookies[settings.JWT_AUTH_REFRESH_COOKIE].value
        self.assertTrue(new_access)
        self.assertTrue(new_refresh)
        self.assertNotEqual(new_refresh, old_refresh)
        self.assertNotEqual(new_access, old_access)

        # Old refresh token is blacklisted after rotation.
        replay = APIClient().post(REFRESH_URL, {"refresh": old_refresh}, format="json")
        self.assertEqual(replay.status_code, status.HTTP_401_UNAUTHORIZED)

        # New cookies keep the session alive.
        me = self.client.get(ME_URL)
        self.assertEqual(me.status_code, status.HTTP_200_OK)

    def test_refresh_without_cookie_or_body_returns_401(self):
        response = APIClient().post(REFRESH_URL, {}, format="json")
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_refresh_with_garbage_token_clears_cookies(self):
        client = APIClient()
        client.cookies[settings.JWT_AUTH_REFRESH_COOKIE] = "garbage"
        response = client.post(REFRESH_URL, {}, format="json")
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(response.cookies[settings.JWT_AUTH_REFRESH_COOKIE].value, "")

    def test_logout_clears_cookies_and_session_is_gone(self):
        self._login()
        response = self.client.post("/api/auth/logout/", {}, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.cookies[settings.JWT_AUTH_COOKIE].value, "")
        self.assertEqual(response.cookies[settings.JWT_AUTH_REFRESH_COOKIE].value, "")

        # The client applies the expired cookies, so the session is gone.
        me = self.client.get(ME_URL)
        self.assertEqual(me.status_code, status.HTTP_401_UNAUTHORIZED)


@override_settings(GOOGLE_CLIENT_ID="test-client-id.apps.googleusercontent.com")
class SessionEstablishingCsrfTests(TestCase):
    """
    Login, Google sign-in and refresh *create* a cookie session, so they are
    CSRF-checked like any other cookie-driven unsafe request (login CSRF).
    """

    def setUp(self):
        cache.clear()
        self.user = User.objects.create_user(
            email="csrf@example.com", full_name="CSRF User", password="TestPass1!"
        )
        self.client = APIClient(enforce_csrf_checks=True)
        self.credentials = {"email": "csrf@example.com", "password": "TestPass1!"}

    def _csrf(self, client=None):
        return (client or self.client).get(CSRF_URL).data["csrfToken"]

    # -- login --------------------------------------------------------

    def test_login_without_csrf_token_is_refused(self):
        self._csrf()  # cookie present, header missing
        response = self.client.post(LOGIN_URL, self.credentials, format="json")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertIn("CSRF", str(response.data))
        self.assertNotIn(settings.JWT_AUTH_COOKIE, response.cookies)

    def test_login_with_invalid_csrf_token_is_refused(self):
        self._csrf()
        response = self.client.post(
            LOGIN_URL, self.credentials, format="json", HTTP_X_CSRFTOKEN="0" * 64
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_login_with_valid_csrf_token_succeeds(self):
        token = self._csrf()
        response = self.client.post(LOGIN_URL, self.credentials, format="json", HTTP_X_CSRFTOKEN=token)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn(settings.JWT_AUTH_COOKIE, response.cookies)

    def test_csrf_failure_does_not_disclose_credential_validity(self):
        self._csrf()
        bad = self.client.post(LOGIN_URL, {**self.credentials, "password": "wrong"}, format="json")
        good = self.client.post(LOGIN_URL, self.credentials, format="json")
        self.assertEqual(bad.status_code, good.status_code)

    # -- verify-email -------------------------------------------------

    def _create_pending(self, email="newuser@example.com", otp="123456"):
        from datetime import timedelta
        from django.contrib.auth.hashers import make_password
        from django.utils import timezone
        return PendingRegistration.objects.create(
            email=email,
            full_name="New User",
            hashed_password=make_password("TestPass1!"),
            otp_hash=make_password(otp),
            otp_expires_at=timezone.now() + timedelta(minutes=5),
            resend_available_at=timezone.now(),
        )

    def test_verify_email_without_csrf_token_is_refused(self):
        pending = self._create_pending()
        self._csrf()
        payload = {"pending_registration_id": str(pending.id), "otp": "123456"}
        response = self.client.post(VERIFY_EMAIL_URL, payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertIn("CSRF", str(response.data))
        self.assertNotIn(settings.JWT_AUTH_COOKIE, response.cookies)
        self.assertNotIn(settings.JWT_AUTH_REFRESH_COOKIE, response.cookies)

    def test_verify_email_with_invalid_csrf_token_is_refused(self):
        pending = self._create_pending()
        self._csrf()
        payload = {"pending_registration_id": str(pending.id), "otp": "123456"}
        response = self.client.post(
            VERIFY_EMAIL_URL, payload, format="json", HTTP_X_CSRFTOKEN="0" * 64
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertNotIn(settings.JWT_AUTH_COOKIE, response.cookies)

    def test_verify_email_with_valid_csrf_token_succeeds(self):
        pending = self._create_pending()
        token = self._csrf()
        payload = {"pending_registration_id": str(pending.id), "otp": "123456"}
        response = self.client.post(
            VERIFY_EMAIL_URL, payload, format="json", HTTP_X_CSRFTOKEN=token
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn(settings.JWT_AUTH_COOKIE, response.cookies)
        self.assertIn(settings.JWT_AUTH_REFRESH_COOKIE, response.cookies)

    # -- google -------------------------------------------------------

    @patch(VERIFY_GOOGLE)
    def test_google_requires_csrf_token(self, mock_verify):
        mock_verify.return_value = {
            "iss": "accounts.google.com",
            "email": "csrf@example.com",
            "email_verified": True,
            "name": "CSRF User",
        }
        self._csrf()
        refused = self.client.post(GOOGLE_URL, {"id_token": "t"}, format="json")
        self.assertEqual(refused.status_code, status.HTTP_403_FORBIDDEN)
        mock_verify.assert_not_called()

        ok = self.client.post(GOOGLE_URL, {"id_token": "t"}, format="json", HTTP_X_CSRFTOKEN=self._csrf())
        self.assertEqual(ok.status_code, status.HTTP_200_OK)

    # -- origin checking ----------------------------------------------

    def test_login_with_production_origin_succeeds(self):
        token = self._csrf()
        response = self.client.post(
            LOGIN_URL,
            self.credentials,
            format="json",
            HTTP_X_CSRFTOKEN=token,
            HTTP_ORIGIN="https://zenflowbd.vercel.app",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn(settings.JWT_AUTH_COOKIE, response.cookies)

    def test_login_with_untrusted_origin_is_refused(self):
        token = self._csrf()
        response = self.client.post(
            LOGIN_URL,
            self.credentials,
            format="json",
            HTTP_X_CSRFTOKEN=token,
            HTTP_ORIGIN="https://malicious.evil.com",
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertIn("CSRF", str(response.data))
        self.assertNotIn(settings.JWT_AUTH_COOKIE, response.cookies)

    def test_verify_email_with_production_origin_succeeds(self):
        pending = self._create_pending()
        token = self._csrf()
        payload = {"pending_registration_id": str(pending.id), "otp": "123456"}
        response = self.client.post(
            VERIFY_EMAIL_URL,
            payload,
            format="json",
            HTTP_X_CSRFTOKEN=token,
            HTTP_ORIGIN="https://zenflowbd.vercel.app",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn(settings.JWT_AUTH_COOKIE, response.cookies)
        self.assertIn(settings.JWT_AUTH_REFRESH_COOKIE, response.cookies)

    def test_verify_email_with_untrusted_origin_is_refused(self):
        pending = self._create_pending()
        token = self._csrf()
        payload = {"pending_registration_id": str(pending.id), "otp": "123456"}
        response = self.client.post(
            VERIFY_EMAIL_URL,
            payload,
            format="json",
            HTTP_X_CSRFTOKEN=token,
            HTTP_ORIGIN="https://malicious.evil.com",
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertIn("CSRF", str(response.data))
        self.assertNotIn(settings.JWT_AUTH_COOKIE, response.cookies)
        self.assertNotIn(settings.JWT_AUTH_REFRESH_COOKIE, response.cookies)

    @patch(VERIFY_GOOGLE)
    def test_google_with_production_origin_succeeds(self, mock_verify):
        mock_verify.return_value = {
            "iss": "accounts.google.com",
            "email": "csrf@example.com",
            "email_verified": True,
            "name": "CSRF User",
        }
        token = self._csrf()
        response = self.client.post(
            GOOGLE_URL,
            {"id_token": "t"},
            format="json",
            HTTP_X_CSRFTOKEN=token,
            HTTP_ORIGIN="https://zenflowbd.vercel.app",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn(settings.JWT_AUTH_COOKIE, response.cookies)

    @patch(VERIFY_GOOGLE)
    def test_google_with_untrusted_origin_is_refused(self, mock_verify):
        token = self._csrf()
        response = self.client.post(
            GOOGLE_URL,
            {"id_token": "t"},
            format="json",
            HTTP_X_CSRFTOKEN=token,
            HTTP_ORIGIN="https://malicious.evil.com",
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertIn("CSRF", str(response.data))
        mock_verify.assert_not_called()
        self.assertNotIn(settings.JWT_AUTH_COOKIE, response.cookies)

    @override_settings(GOOGLE_CLIENT_ID="")
    def test_google_missing_client_id_with_valid_csrf_fails_safely(self):
        token = self._csrf()
        response = self.client.post(
            GOOGLE_URL,
            {"id_token": "t"},
            format="json",
            HTTP_X_CSRFTOKEN=token,
            HTTP_ORIGIN="https://zenflowbd.vercel.app",
        )
        self.assertEqual(response.status_code, status.HTTP_503_SERVICE_UNAVAILABLE)
        self.assertIn("Google sign-in is not available right now.", str(response.data))
        self.assertNotIn(settings.JWT_AUTH_COOKIE, response.cookies)

    # -- refresh ------------------------------------------------------

    def _login(self):
        token = self._csrf()
        response = self.client.post(LOGIN_URL, self.credentials, format="json", HTTP_X_CSRFTOKEN=token)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        return response

    def test_cookie_refresh_requires_csrf_token(self):
        self._login()
        refused = self.client.post(REFRESH_URL, {}, format="json")
        self.assertEqual(refused.status_code, status.HTTP_403_FORBIDDEN)
        # A CSRF failure is not a dead session: cookies are left alone.
        self.assertNotIn(settings.JWT_AUTH_REFRESH_COOKIE, refused.cookies)

        ok = self.client.post(REFRESH_URL, {}, format="json", HTTP_X_CSRFTOKEN=self._csrf())
        self.assertEqual(ok.status_code, status.HTTP_200_OK)
        self.assertTrue(ok.cookies[settings.JWT_AUTH_REFRESH_COOKIE].value)

    def test_body_refresh_for_non_browser_clients_is_csrf_exempt(self):
        refresh = RefreshToken.for_user(self.user)
        response = APIClient(enforce_csrf_checks=True).post(
            REFRESH_URL, {"refresh": str(refresh)}, format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_safe_methods_and_bearer_requests_unchanged(self):
        self._login()
        self.assertEqual(self.client.get(ME_URL).status_code, status.HTTP_200_OK)
        bearer = APIClient(enforce_csrf_checks=True)
        bearer.credentials(HTTP_AUTHORIZATION=f"Bearer {RefreshToken.for_user(self.user).access_token}")
        self.assertEqual(bearer.get(ME_URL).status_code, status.HTTP_200_OK)

    def test_logout_still_works_with_csrf_header(self):
        login = self._login()
        response = self.client.post(LOGOUT_URL, {}, format="json", HTTP_X_CSRFTOKEN=login.data["csrfToken"])
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.cookies[settings.JWT_AUTH_COOKIE].value, "")


class RefreshLifecycleTests(TestCase):
    def setUp(self):
        cache.clear()
        self.client = APIClient()
        self.user = User.objects.create_user(
            email="refresh@example.com", full_name="Refresh User", password="TestPass1!"
        )

    def _login(self, client=None):
        client = client or self.client
        response = client.post(
            LOGIN_URL, {"email": "refresh@example.com", "password": "TestPass1!"}, format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        return response

    def test_deactivated_account_refresh_returns_401_and_clears_cookies(self):
        self._login()
        self.user.is_active = False
        self.user.save(update_fields=["is_active"])

        response = self.client.post(REFRESH_URL, {}, format="json")
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(response.cookies[settings.JWT_AUTH_COOKIE].value, "")
        self.assertEqual(response.cookies[settings.JWT_AUTH_REFRESH_COOKIE].value, "")
        # And the access path agrees.
        self.assertEqual(self.client.get(ME_URL).status_code, status.HTTP_401_UNAUTHORIZED)

    def test_deleted_user_refresh_returns_401_and_clears_cookies(self):
        self._login()
        self.user.delete()

        response = self.client.post(REFRESH_URL, {}, format="json")
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(response.cookies[settings.JWT_AUTH_COOKIE].value, "")
        self.assertEqual(response.cookies[settings.JWT_AUTH_REFRESH_COOKIE].value, "")
        self.assertEqual(self.client.get(ME_URL).status_code, status.HTTP_401_UNAUTHORIZED)

    def test_active_account_refresh_unchanged(self):
        self._login()
        response = self.client.post(REFRESH_URL, {}, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(self.client.get(ME_URL).status_code, status.HTTP_200_OK)

    def test_expired_access_cookie_is_recoverable_via_refresh(self):
        self._login()
        self.client.cookies[settings.JWT_AUTH_COOKIE] = "expired-garbage"
        self.assertEqual(self.client.get(ME_URL).status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(self.client.post(REFRESH_URL, {}, format="json").status_code, status.HTTP_200_OK)
        self.assertEqual(self.client.get(ME_URL).status_code, status.HTTP_200_OK)

    def test_concurrent_refresh_replays_the_rotated_token_and_is_rejected(self):
        """
        Server-side contract behind the cross-tab lock in the frontend: a second
        tab that still holds the pre-rotation refresh token is refused (replay
        protection) and told to drop its cookies. Tabs therefore must serialise
        refreshes, which `silentRefreshSession` does with the Web Locks API.
        """
        self._login()
        stale_refresh = self.client.cookies[settings.JWT_AUTH_REFRESH_COOKIE].value

        first = self.client.post(REFRESH_URL, {}, format="json")
        self.assertEqual(first.status_code, status.HTTP_200_OK)

        second_tab = APIClient()
        second_tab.cookies[settings.JWT_AUTH_REFRESH_COOKIE] = stale_refresh
        second = second_tab.post(REFRESH_URL, {}, format="json")
        self.assertEqual(second.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(second.cookies[settings.JWT_AUTH_REFRESH_COOKIE].value, "")

        # The tab that won the race keeps a working session.
        self.assertEqual(self.client.get(ME_URL).status_code, status.HTTP_200_OK)


class AuthenticatedPasswordChangeSessionTests(TestCase):
    """POST /api/auth/password/reset/ (OTP change) must end every *other* session."""

    def setUp(self):
        cache.clear()
        self.user = User.objects.create_user(
            email="change@example.com", full_name="Change User", password="OldPass1!"
        )
        self.phone = APIClient()
        self.laptop = APIClient()
        for device in (self.phone, self.laptop):
            response = device.post(
                LOGIN_URL, {"email": "change@example.com", "password": "OldPass1!"}, format="json"
            )
            self.assertEqual(response.status_code, status.HTTP_200_OK)
        # Phone rotated once, so it holds a rotated (outstanding) refresh token.
        self.assertEqual(self.phone.post(REFRESH_URL, {}, format="json").status_code, status.HTTP_200_OK)

    @patch("users.services.email_service.SMTPEmailService.send_password_reset_email")
    def _change_password_on_laptop(self, _mock_mail):
        self.assertEqual(self.laptop.post(OTP_URL, {}, format="json").status_code, status.HTTP_200_OK)
        with patch("users.services.otp_service.OTPService.verify_otp", return_value=True):
            return self.laptop.post(
                CHANGE_URL,
                {"otp": "123456", "new_password": "NewPass1!", "confirm_password": "NewPass1!"},
                format="json",
            )

    def test_other_devices_are_signed_out_and_current_browser_keeps_a_fresh_session(self):
        old_laptop_refresh = self.laptop.cookies[settings.JWT_AUTH_REFRESH_COOKIE].value

        response = self._change_password_on_laptop()
        self.assertEqual(response.status_code, status.HTTP_200_OK, response.data)
        self.assertEqual(response.data["message"], "Password updated successfully.")
        self.assertNotIn("tokens", response.data)
        self.assertIn("csrfToken", response.data)

        # Current browser: brand-new cookies that work.
        new_laptop_refresh = response.cookies[settings.JWT_AUTH_REFRESH_COOKIE].value
        self.assertTrue(new_laptop_refresh)
        self.assertNotEqual(new_laptop_refresh, old_laptop_refresh)
        self.assertEqual(self.laptop.get(ME_URL).status_code, status.HTTP_200_OK)
        self.assertEqual(self.laptop.post(REFRESH_URL, {}, format="json").status_code, status.HTTP_200_OK)

        # The laptop's previous refresh token and the phone's (rotated) one are dead.
        replay = APIClient().post(REFRESH_URL, {"refresh": old_laptop_refresh}, format="json")
        self.assertEqual(replay.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(self.phone.post(REFRESH_URL, {}, format="json").status_code, status.HTTP_401_UNAUTHORIZED)

    def test_new_password_works_and_old_password_fails(self):
        self.assertEqual(self._change_password_on_laptop().status_code, status.HTTP_200_OK)
        fresh = APIClient()
        old = fresh.post(LOGIN_URL, {"email": "change@example.com", "password": "OldPass1!"}, format="json")
        self.assertEqual(old.status_code, status.HTTP_401_UNAUTHORIZED)
        new = fresh.post(LOGIN_URL, {"email": "change@example.com", "password": "NewPass1!"}, format="json")
        self.assertEqual(new.status_code, status.HTTP_200_OK)

    def test_failed_otp_revokes_nothing(self):
        with patch("users.services.email_service.SMTPEmailService.send_password_reset_email"):
            self.laptop.post(OTP_URL, {}, format="json")
        with patch("users.services.otp_service.OTPService.verify_otp", return_value=False):
            response = self.laptop.post(
                CHANGE_URL,
                {"otp": "000000", "new_password": "NewPass1!", "confirm_password": "NewPass1!"},
                format="json",
            )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(self.phone.post(REFRESH_URL, {}, format="json").status_code, status.HTTP_200_OK)
        self.user.refresh_from_db()
        self.assertTrue(self.user.check_password("OldPass1!"))

    def test_password_change_otp_lockout_at_five_attempts(self):
        """OTP attempt limit must match OTP_MAX_FAILED_ATTEMPTS (5) and lock out on attempt 5."""
        with patch("users.services.email_service.SMTPEmailService.send_password_reset_email"):
            self.laptop.post(OTP_URL, {}, format="json")

        payload = {"otp": "000000", "new_password": "NewPass1!", "confirm_password": "NewPass1!"}
        # Failed attempts 1 through 4 should report remaining attempts
        for attempt, expected_remaining in enumerate([4, 3, 2, 1], start=1):
            with patch("users.services.otp_service.OTPService.verify_otp", return_value=False):
                res = self.laptop.post(CHANGE_URL, payload, format="json")
                self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
                self.assertIn(f"{expected_remaining} attempt(s) remaining", str(res.data))

        # 5th failed attempt should trigger lockout and delete OTP record
        with patch("users.services.otp_service.OTPService.verify_otp", return_value=False):
            res5 = self.laptop.post(CHANGE_URL, payload, format="json")
            self.assertEqual(res5.status_code, status.HTTP_400_BAD_REQUEST)
            self.assertIn("Too many failed attempts", str(res5.data))

        # Subsequent attempt finds no record
        res6 = self.laptop.post(CHANGE_URL, payload, format="json")
        self.assertEqual(res6.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("No active password reset request found", str(res6.data))


class OriginConfigurationTests(TestCase):
    """
    Test origin normalization, comma-separated parsing, localhost preservation,
    independent cookie domain settings, and CSRF/CORS settings behavior.
    """

    def test_normalize_origin_valid_cases(self):
        from config.settings import _normalize_origin

        valid_cases = {
            "https://zenflowbd.vercel.app": "https://zenflowbd.vercel.app",
            "https://zenflowbd.vercel.app/": "https://zenflowbd.vercel.app",
            "https://example.com:8443": "https://example.com:8443",
            "http://localhost:3000": "http://localhost:3000",
            "http://localhost:3000/": "http://localhost:3000",
            "https://[::1]:8443": "https://[::1]:8443",
            "zenflowbd.vercel.app": "https://zenflowbd.vercel.app",
            "example.com:8080": "https://example.com:8080",
            "http://example.com:80": "http://example.com",
            "https://example.com:443": "https://example.com",
            "HTTPS://EXAMPLE.COM": "https://example.com",
            "  https://zenflowbd.vercel.app  ": "https://zenflowbd.vercel.app",
            '"https://zenflowbd.vercel.app"': "https://zenflowbd.vercel.app",
            "'https://zenflowbd.vercel.app'": "https://zenflowbd.vercel.app",
        }
        for input_val, expected in valid_cases.items():
            with self.subTest(origin=input_val):
                self.assertEqual(_normalize_origin(input_val), expected)

    def test_normalize_origin_invalid_cases(self):
        from config.settings import _normalize_origin

        invalid_cases = [
            "ftp://example.com",
            "javascript:alert(1)",
            "data:text/html,test",
            "https://user:pass@example.com",
            "https://example.com/path",
            "https://example.com?x=1",
            "https://example.com#fragment",
            "https://",
            "https://example.com:invalid",
            "*",
            "https://*",
            "https://*.vercel.app",
            "",
            "   ",
            "mailto:test@example.com",
            "https://example.com:70000",
            "https://-badhost.com",
            "https://badhost-.com",
        ]
        for input_val in invalid_cases:
            with self.subTest(origin=input_val):
                self.assertIsNone(_normalize_origin(input_val))

    def test_parse_origins_handles_comma_separated_strings(self):
        from config.settings import _parse_origins

        raw = " https://zenflowbd.vercel.app/ , 'https://custom.app:8443' , http://localhost:3000 "
        parsed = _parse_origins(raw)
        self.assertIn("https://zenflowbd.vercel.app", parsed)
        self.assertIn("https://custom.app:8443", parsed)
        self.assertIn("http://localhost:3000", parsed)
        self.assertIn("http://127.0.0.1:3000", parsed)

    def test_parse_origins_discards_invalid_origins(self):
        from config.settings import _parse_origins

        raw = (
            "ftp://bad.com, https://zenflowbd.vercel.app, javascript:alert(1), "
            "https://example.com/path, *, https://example.com:8443"
        )
        parsed = _parse_origins(raw)
        self.assertIn("https://zenflowbd.vercel.app", parsed)
        self.assertIn("https://example.com:8443", parsed)
        self.assertNotIn("ftp://bad.com", parsed)
        self.assertNotIn("javascript:alert(1)", parsed)
        self.assertNotIn("https://example.com/path", parsed)
        self.assertNotIn("*", parsed)

    def test_parse_origins_preserves_localhost_even_with_custom_origins(self):
        from config.settings import _parse_origins

        parsed = _parse_origins("https://production.example.com")
        self.assertIn("https://production.example.com", parsed)
        self.assertIn("http://localhost:3000", parsed)
        self.assertIn("http://127.0.0.1:3000", parsed)

    def test_production_frontend_is_trusted_by_default(self):
        self.assertIn("https://zenflowbd.vercel.app", settings.CSRF_TRUSTED_ORIGINS)
        self.assertIn("https://zenflowbd.vercel.app", settings.CORS_ALLOWED_ORIGINS)

    def test_cors_credentials_and_origins_configuration(self):
        self.assertTrue(settings.CORS_ALLOW_CREDENTIALS)
        self.assertFalse(settings.CORS_ALLOW_ALL_ORIGINS)
        self.assertIn("http://localhost:3000", settings.CORS_ALLOWED_ORIGINS)
        self.assertIn("http://127.0.0.1:3000", settings.CORS_ALLOWED_ORIGINS)

    def test_csrf_cookie_domain_defaults_to_none_independently(self):
        self.assertIsNone(settings.CSRF_COOKIE_DOMAIN)
        self.assertIsNone(settings.JWT_AUTH_COOKIE_DOMAIN)

    @override_settings(CSRF_COOKIE_DOMAIN=".custom-csrf.com", JWT_AUTH_COOKIE_DOMAIN=".custom-jwt.com")
    def test_explicit_csrf_cookie_domain_handled_independently(self):
        self.assertEqual(settings.CSRF_COOKIE_DOMAIN, ".custom-csrf.com")
        self.assertEqual(settings.JWT_AUTH_COOKIE_DOMAIN, ".custom-jwt.com")
