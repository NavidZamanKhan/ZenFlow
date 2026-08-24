from __future__ import annotations

from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase
from rest_framework_simplejwt.tokens import RefreshToken

from tasks.models import Task
from users.models import AccountOTP

User = get_user_model()


class AccountSecurityTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            email="testuser@example.com",
            password="SecurePassword123!",
            full_name="Test User",
            email_verified=True,
        )
        refresh = RefreshToken.for_user(self.user)
        self.access_token = str(refresh.access_token)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.access_token}")

    @patch("users.services.email_service.SMTPEmailService.send_password_reset_email")
    def test_password_reset_flow(self, mock_send_email):
        mock_send_email.return_value = None

        # 1. Request password reset OTP
        otp_url = reverse("auth-password-otp")
        response = self.client.post(otp_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(mock_send_email.called)

        # Retrieve generated OTP from DB
        otp_record = AccountOTP.objects.get(
            user=self.user, purpose=AccountOTP.PURPOSE_PASSWORD_RESET
        )
        # Mock OTP service verify for predictable test
        with patch(
            "users.services.otp_service.OTPService.verify_otp", return_value=True
        ):
            reset_url = reverse("auth-password-reset")
            reset_resp = self.client.post(
                reset_url,
                {
                    "otp": "123456",
                    "new_password": "NewSecurePassword123!",
                    "confirm_password": "NewSecurePassword123!",
                },
            )
            self.assertEqual(reset_resp.status_code, status.HTTP_200_OK)

        self.user.refresh_from_db()
        self.assertTrue(self.user.check_password("NewSecurePassword123!"))

    def test_set_password_for_oauth_account(self):
        oauth_user = User.objects.create_user(
            email="oauth@example.com",
            full_name="OAuth User",
            email_verified=True,
        )
        oauth_user.set_unusable_password()
        oauth_user.save()

        refresh = RefreshToken.for_user(oauth_user)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {str(refresh.access_token)}")

        url = reverse("auth-password-set")
        response = self.client.post(
            url,
            {
                "new_password": "CreatedPassword123!",
                "confirm_password": "CreatedPassword123!",
            },
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        oauth_user.refresh_from_db()
        self.assertTrue(oauth_user.has_usable_password())
        self.assertTrue(oauth_user.check_password("CreatedPassword123!"))

    def test_set_password_rejected_if_already_has_password(self):
        url = reverse("auth-password-set")
        response = self.client.post(
            url,
            {
                "new_password": "AnotherPassword123!",
                "confirm_password": "AnotherPassword123!",
            },
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    @patch("users.services.email_service.SMTPEmailService.send_account_deletion_email")
    def test_delete_account_flow(self, mock_send_email):
        mock_send_email.return_value = None

        # Create a task for user to verify cascade
        Task.objects.create(
            user=self.user,
            title="User Task",
        )
        self.assertEqual(Task.objects.filter(user=self.user).count(), 1)

        # 1. Request delete account OTP
        otp_url = reverse("auth-delete-account-otp")
        response = self.client.post(otp_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        # 2. Confirm deletion with wrong password -> should fail
        delete_url = reverse("auth-delete-account")
        with patch(
            "users.services.otp_service.OTPService.verify_otp", return_value=True
        ):
            bad_resp = self.client.post(
                delete_url,
                {
                    "otp": "123456",
                    "password": "WrongPassword!",
                },
            )
            self.assertEqual(bad_resp.status_code, status.HTTP_400_BAD_REQUEST)

            # 3. Confirm deletion with correct password
            good_resp = self.client.post(
                delete_url,
                {
                    "otp": "123456",
                    "password": "SecurePassword123!",
                },
            )
            self.assertEqual(good_resp.status_code, status.HTTP_200_OK)

        # Verify user and related tasks deleted
        self.assertFalse(User.objects.filter(email="testuser@example.com").exists())
        self.assertEqual(Task.objects.filter(title="User Task").count(), 0)

    def test_delete_account_rejected_if_no_password_set(self):
        oauth_user = User.objects.create_user(
            email="oauth2@example.com",
            full_name="OAuth User 2",
            email_verified=True,
        )
        oauth_user.set_unusable_password()
        oauth_user.save()

        refresh = RefreshToken.for_user(oauth_user)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {str(refresh.access_token)}")

        otp_url = reverse("auth-delete-account-otp")
        response = self.client.post(otp_url)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("Please set up a password first", str(response.data))
