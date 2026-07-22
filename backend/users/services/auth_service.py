from __future__ import annotations

import logging
from typing import Any

from django.contrib.auth import get_user_model
from django.contrib.auth.hashers import check_password, make_password
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError
from django.utils import timezone
from rest_framework_simplejwt.tokens import RefreshToken

from users.models import PendingRegistration

from .email_service import get_email_service
from .otp_service import OTP_MAX_FAILED_ATTEMPTS, OTPService

logger = logging.getLogger(__name__)

User = get_user_model()


class AuthService:
    """
    Core authentication service. All auth business logic lives here.
    Views delegate to this service and remain thin.
    """

    def __init__(self) -> None:
        self.otp_service = OTPService()
        self.email_service = get_email_service()

    # ------------------------------------------------------------------
    # Registration
    # ------------------------------------------------------------------

    def register(
        self,
        full_name: str,
        email: str,
        password: str,
    ) -> dict[str, Any]:
        """
        Step 1 of registration:
        - Validate password complexity
        - Check if email is already registered
        - Create or update PendingRegistration
        - Generate OTP, hash it, send verification email
        - Return pending_registration_id

        Returns a generic success response regardless of whether the email
        is already registered (prevents email enumeration).
        """
        email = email.lower().strip()

        # Check if a verified user already exists with this email
        if User.objects.filter(email=email).exists():
            # Return generic response to prevent email enumeration
            logger.warning(
                "Registration attempt for existing email: %s", email
            )
            return {
                "message": "If this email is available, a verification code has been sent.",
            }

        # Validate password using Django's validators
        try:
            validate_password(password)
        except ValidationError as e:
            raise ValidationError(e.messages)

        # Hash the password for storage in PendingRegistration
        hashed_password = make_password(password)

        # Generate OTP
        otp = self.otp_service.generate_otp()
        otp_hash = self.otp_service.hash_otp(otp)
        otp_expires_at = self.otp_service.get_expiry_time()
        resend_available_at = self.otp_service.get_resend_available_time()

        # Upsert PendingRegistration — last registration attempt wins
        pending, created = PendingRegistration.objects.update_or_create(
            email=email,
            defaults={
                "full_name": full_name,
                "hashed_password": hashed_password,
                "otp_hash": otp_hash,
                "otp_expires_at": otp_expires_at,
                "resend_available_at": resend_available_at,
                "failed_attempts": 0,
            },
        )

        # Send verification email
        self.email_service.send_verification_email(
            to_email=email,
            full_name=full_name,
            otp=otp,
        )

        logger.info(
            "PendingRegistration %s for %s",
            "created" if created else "updated",
            email,
        )

        return {
            "message": "If this email is available, a verification code has been sent.",
            "pending_registration_id": str(pending.id),
        }

    # ------------------------------------------------------------------
    # Email Verification
    # ------------------------------------------------------------------

    def verify_email(
        self,
        pending_registration_id: str,
        otp: str,
    ) -> dict[str, Any]:
        """
        Step 2 of registration:
        - Validate the OTP against the PendingRegistration
        - On success: create User, delete PendingRegistration, issue JWT
        - On failure: increment failed attempts
        """
        try:
            pending = PendingRegistration.objects.get(
                id=pending_registration_id
            )
        except PendingRegistration.DoesNotExist:
            raise ValidationError("Invalid or expired registration.")

        # Check if OTP has expired
        if self.otp_service.is_expired(pending.otp_expires_at):
            raise ValidationError(
                "Verification code has expired. Please request a new one."
            )

        # Check if max attempts exceeded
        if self.otp_service.has_exceeded_max_attempts(pending.failed_attempts):
            pending.delete()
            raise ValidationError(
                "Too many failed attempts. Please register again."
            )

        # Verify the OTP
        if not self.otp_service.verify_otp(otp, pending.otp_hash):
            pending.failed_attempts += 1
            pending.save(update_fields=["failed_attempts"])

            remaining = OTP_MAX_FAILED_ATTEMPTS - pending.failed_attempts

            raise ValidationError(
                f"Invalid verification code. {remaining} attempts remaining."
            )

        # OTP is valid — create the real User
        user = User.objects.create_user(
            email=pending.email,
            full_name=pending.full_name,
            password=None,  # We'll set the pre-hashed password directly
            email_verified=True,
        )
        # Set the pre-hashed password directly (already Argon2id)
        user.password = pending.hashed_password
        user.save(update_fields=["password"])

        # Delete the PendingRegistration
        pending.delete()

        # Issue JWT tokens
        tokens = self._issue_tokens(user)

        logger.info("User created and verified: %s", user.email)

        return {
            "tokens": tokens,
            "user": {
                "id": str(user.id),
                "email": user.email,
                "full_name": user.full_name,
                "email_verified": user.email_verified,
            },
        }

    # ------------------------------------------------------------------
    # Resend OTP
    # ------------------------------------------------------------------

    def resend_otp(self, pending_registration_id: str) -> dict[str, Any]:
        """
        Resend a new OTP for an existing PendingRegistration.
        - Enforces the 60-second cooldown
        - Generates a completely new OTP (previous becomes invalid)
        """
        try:
            pending = PendingRegistration.objects.get(
                id=pending_registration_id
            )
        except PendingRegistration.DoesNotExist:
            raise ValidationError("Invalid or expired registration.")

        # Check cooldown
        if not self.otp_service.can_resend(pending.resend_available_at):
            seconds_left = int(
                (pending.resend_available_at - timezone.now()).total_seconds()
            )
            raise ValidationError(
                f"Please wait {seconds_left} seconds before requesting a new code."
            )

        # Generate a completely new OTP
        otp = self.otp_service.generate_otp()
        pending.otp_hash = self.otp_service.hash_otp(otp)
        pending.otp_expires_at = self.otp_service.get_expiry_time()
        pending.resend_available_at = self.otp_service.get_resend_available_time()
        pending.failed_attempts = 0  # Reset attempts on resend
        pending.save(
            update_fields=[
                "otp_hash",
                "otp_expires_at",
                "resend_available_at",
                "failed_attempts",
            ]
        )

        # Send the new OTP
        self.email_service.send_verification_email(
            to_email=pending.email,
            full_name=pending.full_name,
            otp=otp,
        )

        logger.info("OTP resent for %s", pending.email)

        return {
            "message": "A new verification code has been sent.",
        }

    # ------------------------------------------------------------------
    # Login
    # ------------------------------------------------------------------

    def login(self, email: str, password: str) -> dict[str, Any]:
        """
        Authenticate a user with email and password.
        Returns JWT tokens and user data on success.
        """
        email = email.lower().strip()

        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            raise ValidationError("Invalid email or password.")

        if not user.is_active:
            raise ValidationError("This account has been deactivated.")

        if not check_password(password, user.password):
            raise ValidationError("Invalid email or password.")

        # Issue JWT tokens
        tokens = self._issue_tokens(user)

        logger.info("User logged in: %s", user.email)

        return {
            "tokens": tokens,
            "user": {
                "id": str(user.id),
                "email": user.email,
                "full_name": user.full_name,
                "email_verified": user.email_verified,
            },
        }

    # ------------------------------------------------------------------
    # Logout
    # ------------------------------------------------------------------

    def logout(self, refresh_token: str) -> dict[str, str]:
        """
        Blacklist the provided refresh token.
        """
        try:
            token = RefreshToken(refresh_token)
            token.blacklist()
        except Exception:
            raise ValidationError("Invalid or expired token.")

        return {"detail": "Successfully logged out."}

    # ------------------------------------------------------------------
    # Private Helpers
    # ------------------------------------------------------------------

    @staticmethod
    def _issue_tokens(user: Any) -> dict[str, str]:
        """Generate JWT access and refresh tokens for the given user."""
        refresh = RefreshToken.for_user(user)
        return {
            "access": str(refresh.access_token),
            "refresh": str(refresh),
        }
