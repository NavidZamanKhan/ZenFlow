"""
Security tests for POST /api/auth/google/.

Google's ID token is verified by google-auth (signature, expiry, issuer and
audience); these tests stub that call and exercise everything the service
layers on top of it: audience/configuration failures, the ``email_verified``
requirement, account linking rules and provider outages.
"""

from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.test import TestCase, override_settings
from rest_framework import status
from rest_framework.test import APIClient

from users.tests.test_views import assert_session_cookies

User = get_user_model()

GOOGLE_URL = "/api/auth/google/"
LOGIN_URL = "/api/auth/login/"
CLIENT_ID = "test-client-id.apps.googleusercontent.com"
VERIFY = "users.services.auth_service.google_id_token.verify_oauth2_token"


def claims(**overrides):
    base = {
        "iss": "https://accounts.google.com",
        "aud": CLIENT_ID,
        "sub": "1234567890",
        "email": "person@example.com",
        "email_verified": True,
        "name": "Person Example",
    }
    base.update(overrides)
    return base


@override_settings(GOOGLE_CLIENT_ID=CLIENT_ID)
class GoogleAuthSecurityTests(TestCase):
    def setUp(self):
        cache.clear()
        self.client = APIClient()

    def _post(self, token="google-id-token"):
        return self.client.post(GOOGLE_URL, {"id_token": token}, format="json")

    # -- verification contract ------------------------------------------

    @patch(VERIFY)
    def test_valid_id_token_is_verified_against_configured_audience(self, mock_verify):
        mock_verify.return_value = claims()
        response = self._post("the-token")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        assert_session_cookies(self, response)
        # google-auth is asked to enforce *our* client id as the audience.
        args, kwargs = mock_verify.call_args
        self.assertEqual(args[0], "the-token")
        self.assertEqual(kwargs.get("audience"), CLIENT_ID)

    @patch(VERIFY, side_effect=ValueError("Token has wrong audience"))
    def test_wrong_audience_is_rejected(self, _mock_verify):
        response = self._post()
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertFalse(User.objects.filter(email="person@example.com").exists())

    @patch(VERIFY, side_effect=ValueError("Token expired"))
    def test_invalid_or_expired_token_is_rejected(self, _mock_verify):
        response = self._post()
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertNotIn("zf_access", response.cookies)

    @patch(VERIFY)
    def test_unexpected_issuer_is_rejected(self, mock_verify):
        mock_verify.return_value = claims(iss="https://evil.example")
        self.assertEqual(self._post().status_code, status.HTTP_400_BAD_REQUEST)

    @override_settings(GOOGLE_CLIENT_ID="")
    @patch(VERIFY)
    def test_missing_client_id_fails_closed(self, mock_verify):
        mock_verify.return_value = claims()
        response = self._post()
        self.assertEqual(response.status_code, status.HTTP_503_SERVICE_UNAVAILABLE)
        mock_verify.assert_not_called()
        self.assertFalse(User.objects.filter(email="person@example.com").exists())

    @patch(VERIFY, side_effect=ConnectionError("certs unreachable"))
    def test_provider_outage_is_a_503_not_a_login(self, _mock_verify):
        response = self._post()
        self.assertEqual(response.status_code, status.HTTP_503_SERVICE_UNAVAILABLE)
        self.assertNotIn("zf_access", response.cookies)

    def test_access_tokens_are_no_longer_accepted(self):
        response = self.client.post(GOOGLE_URL, {"access_token": "ya29.abc"}, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_blank_id_token_is_rejected(self):
        self.assertEqual(self._post("").status_code, status.HTTP_400_BAD_REQUEST)

    # -- email_verified -----------------------------------------------

    @patch(VERIFY)
    def test_unverified_email_cannot_create_an_account(self, mock_verify):
        mock_verify.return_value = claims(email_verified=False)
        response = self._post()
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("not verified", str(response.data))
        self.assertFalse(User.objects.filter(email="person@example.com").exists())

    @patch(VERIFY)
    def test_unverified_email_cannot_take_over_existing_password_account(self, mock_verify):
        victim = User.objects.create_user(
            email="person@example.com", full_name="Victim", password="VictimPass1!"
        )
        mock_verify.return_value = claims(email_verified=False, name="Mallory")
        response = self._post()
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertNotIn("zf_access", response.cookies)
        victim.refresh_from_db()
        self.assertEqual(victim.full_name, "Victim")

    @patch(VERIFY)
    def test_missing_email_verified_claim_is_treated_as_unverified(self, mock_verify):
        c = claims()
        del c["email_verified"]
        mock_verify.return_value = c
        self.assertEqual(self._post().status_code, status.HTTP_400_BAD_REQUEST)

    @patch(VERIFY)
    def test_string_true_email_verified_is_accepted(self, mock_verify):
        mock_verify.return_value = claims(email_verified="true")
        self.assertEqual(self._post().status_code, status.HTTP_200_OK)

    # -- account linking ----------------------------------------------

    @patch(VERIFY)
    def test_verified_google_identity_logs_into_existing_password_account(self, mock_verify):
        user = User.objects.create_user(
            email="person@example.com", full_name="Original Name", password="OrigPass1!"
        )
        mock_verify.return_value = claims(name="Google Name")
        response = self._post()

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        assert_session_cookies(self, response)
        self.assertEqual(response.data["user"]["id"], str(user.id))
        self.assertTrue(response.data["user"]["has_password"])
        user.refresh_from_db()
        # Linking does not rewrite the local profile or password.
        self.assertEqual(user.full_name, "Original Name")
        self.assertTrue(user.check_password("OrigPass1!"))
        self.assertEqual(User.objects.filter(email="person@example.com").count(), 1)

    @patch(VERIFY)
    def test_email_is_matched_case_insensitively(self, mock_verify):
        user = User.objects.create_user(
            email="person@example.com", full_name="P", password="OrigPass1!"
        )
        mock_verify.return_value = claims(email="Person@Example.com")
        response = self._post()
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["user"]["id"], str(user.id))

    @patch(VERIFY)
    def test_new_verified_identity_creates_account_without_usable_password(self, mock_verify):
        mock_verify.return_value = claims()
        response = self._post()
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        user = User.objects.get(email="person@example.com")
        self.assertFalse(user.has_usable_password())
        self.assertTrue(user.email_verified)
        self.assertFalse(response.data["user"]["has_password"])

        # ...and that account cannot be entered with a guessed password.
        login = APIClient().post(
            LOGIN_URL, {"email": "person@example.com", "password": "Anything1!"}, format="json"
        )
        self.assertEqual(login.status_code, status.HTTP_401_UNAUTHORIZED)

    @patch(VERIFY)
    def test_existing_google_account_logs_in_again(self, mock_verify):
        mock_verify.return_value = claims()
        self.assertEqual(self._post().status_code, status.HTTP_200_OK)
        again = APIClient().post(GOOGLE_URL, {"id_token": "t2"}, format="json")
        self.assertEqual(again.status_code, status.HTTP_200_OK)
        assert_session_cookies(self, again)
        self.assertEqual(User.objects.filter(email="person@example.com").count(), 1)

    @patch(VERIFY)
    def test_deactivated_account_is_rejected(self, mock_verify):
        User.objects.create_user(
            email="person@example.com", full_name="P", password="OrigPass1!", is_active=False
        )
        mock_verify.return_value = claims()
        response = self._post()
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("deactivated", str(response.data).lower())
        self.assertNotIn("zf_access", response.cookies)

    @patch(VERIFY)
    def test_identity_fields_in_request_body_are_ignored(self, mock_verify):
        """Only the verified claims decide who logs in - never the request body."""
        User.objects.create_user(email="victim@example.com", full_name="V", password="VictimPass1!")
        mock_verify.return_value = claims(email="attacker@example.com")
        response = self.client.post(
            GOOGLE_URL,
            {"id_token": "t", "email": "victim@example.com", "access_token": "ya29.x"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["user"]["email"], "attacker@example.com")

    @patch(VERIFY)
    def test_overlong_google_name_is_truncated_not_crashing(self, mock_verify):
        mock_verify.return_value = claims(name="N" * 400)
        response = self._post()
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(User.objects.get(email="person@example.com").full_name), 150)
