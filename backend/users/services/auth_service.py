from __future__ import annotations

import logging
from typing import Any

from django.conf import settings
from django.contrib.auth import get_user_model
from django.contrib.auth.hashers import check_password, make_password
from django.contrib.auth.password_validation import validate_password
from django.contrib.auth.tokens import default_token_generator
from django.core.exceptions import ValidationError
from django.db import IntegrityError, transaction
from django.utils import timezone
from django.utils.encoding import force_bytes, force_str
from django.utils.http import urlsafe_base64_decode, urlsafe_base64_encode
from rest_framework_simplejwt.token_blacklist.models import (
    BlacklistedToken,
    OutstandingToken,
)
from rest_framework_simplejwt.tokens import RefreshToken

from users.models import AccountOTP, PendingRegistration

from google.auth.transport import requests as google_requests
from google.oauth2 import id_token as google_id_token

from .email_service import get_email_service
from .otp_service import OTP_MAX_FAILED_ATTEMPTS, OTPService

logger = logging.getLogger(__name__)

User = get_user_model()

GOOGLE_ISSUERS = ("accounts.google.com", "https://accounts.google.com")


class GoogleAuthUnavailable(ValidationError):
    """
    Google sign-in cannot be performed right now for an operational reason
    (server misconfiguration or Google unreachable) - as opposed to the caller
    presenting a bad token. Views map this to 503 instead of 400.
    """


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

        # Upsert PendingRegistration - last registration attempt wins
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

        # Always log OTP in development so it is visible even if the console
        # email backend output is swallowed by a Windows reloader/terminal quirk.
        if settings.DEBUG:
            logger.info("OTP=%s email=%s", otp, email)
            # print() survives Windows runserver reloader/terminal capture quirks
            # where logger output can be easy to miss.
            print(f"[ZenFlow] OTP={otp} email={email}", flush=True)

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

        # OTP is valid. The email may have been claimed since the registration
        # started (e.g. the person signed in with Google in the meantime), so
        # check before creating and never let a unique-constraint error escape.
        if User.objects.filter(email=pending.email).exists():
            pending.delete()
            raise ValidationError(
                "An account with this email already exists. Please log in instead."
            )

        try:
            with transaction.atomic():
                user = User.objects.create_user(
                    email=pending.email,
                    full_name=pending.full_name,
                    password=None,  # We'll set the pre-hashed password directly
                    email_verified=True,
                )
                # Set the pre-hashed password directly (already Argon2id)
                user.password = pending.hashed_password
                user.save(update_fields=["password"])
                pending.delete()
        except IntegrityError:
            # Lost a race with a concurrent sign-up for the same email.
            PendingRegistration.objects.filter(pk=pending.pk).delete()
            raise ValidationError(
                "An account with this email already exists. Please log in instead."
            )

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
                "has_password": user.has_usable_password(),
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

        if settings.DEBUG:
            logger.info("OTP=%s email=%s", otp, pending.email)
            print(f"[ZenFlow] OTP={otp} email={pending.email}", flush=True)

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

        # Evaluate password even for inactive accounts to prevent timing side-channels,
        # but always return the generic message to avoid account-status enumeration.
        password_valid = check_password(password, user.password)
        if not user.is_active or not password_valid:
            if not user.is_active and password_valid:
                logger.warning("Login attempt for deactivated user: %s", user.email)
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
                "has_password": user.has_usable_password(),
            },
        }

    # ------------------------------------------------------------------
    # Google OAuth
    # ------------------------------------------------------------------

    def google_auth(self, id_token_str: str) -> dict[str, Any]:
        """
        Verify a Google *ID token* and log in or register the user.

        The token is verified with Google's library (signature against Google's
        published certificates, expiry, issuer) and its audience must be this
        deployment's ``GOOGLE_CLIENT_ID`` - a token minted for any other OAuth
        client is refused. Google must also assert ``email_verified``; an
        unverified address is never used to log in or to link an existing
        email/password account. Nothing about the identity is taken from the
        request body.
        """
        id_info = self._verify_google_id_token(id_token_str)

        email = id_info.get("email")
        if not email:
            raise ValidationError("Google account did not provide an email address.")
        if id_info.get("email_verified") not in (True, "true"):
            logger.warning("Google sign-in refused: email not verified by Google.")
            raise ValidationError(
                "Your Google account's email address is not verified. "
                "Verify it with Google or sign in with your password."
            )

        email = email.lower().strip()
        full_name = (id_info.get("name") or id_info.get("given_name") or email.split("@")[0])[:150]

        # Verified Google identity + matching email -> log in (and thereby
        # link) the existing account; otherwise create a password-less user.
        try:
            with transaction.atomic():
                user, created = User.objects.get_or_create(
                    email=email,
                    defaults={
                        "full_name": full_name,
                        "email_verified": True,
                        "is_active": True,
                    },
                )
                if created:
                    user.set_unusable_password()
                    user.save(update_fields=["password"])
        except IntegrityError:
            # Lost a race with a concurrent sign-up for the same email.
            user, created = User.objects.get(email=email), False

        if created:
            logger.info("New user registered via Google: %s", user.email)
        else:
            if not user.is_active:
                raise ValidationError("This account has been deactivated.")
            if not user.email_verified:
                user.email_verified = True
                user.save(update_fields=["email_verified"])
            logger.info("Existing user logged in via Google: %s", user.email)

        # Issue JWT tokens
        tokens = self._issue_tokens(user)

        return {
            "tokens": tokens,
            "user": {
                "id": str(user.id),
                "email": user.email,
                "full_name": user.full_name,
                "email_verified": user.email_verified,
                "has_password": user.has_usable_password(),
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
    # Password Management & Account Deletion
    # ------------------------------------------------------------------

    def set_password(self, user: Any, new_password: str) -> User:
        """
        Set a password for an account that does not have a usable password
        (e.g., created via Google OAuth).
        """
        if user.has_usable_password():
            raise ValidationError("This account already has a password. Use change password instead.")

        user.set_password(new_password)
        user.save(update_fields=["password", "updated_at"])
        logger.info("Password set for OAuth account: %s", user.email)
        return user

    def send_password_reset_otp(self, user: Any) -> dict[str, str]:
        """
        Send a 6-digit OTP to the user's email for resetting/changing password.
        """
        existing_otp = AccountOTP.objects.filter(
            user=user, purpose=AccountOTP.PURPOSE_PASSWORD_RESET
        ).first()

        if existing_otp and not self.otp_service.can_resend(existing_otp.resend_available_at):
            raise ValidationError("Please wait a moment before requesting another code.")

        otp = self.otp_service.generate_otp()
        otp_hash = self.otp_service.hash_otp(otp)
        otp_expires_at = self.otp_service.get_expiry_time()
        resend_available_at = self.otp_service.get_resend_available_time()

        try:
            self.email_service.send_password_reset_email(user.email, user.full_name, otp)
        except Exception as e:
            logger.error("Failed to send password reset email to %s: %s", user.email, e)
            raise ValidationError("Could not send email. Please verify email/SMTP settings and try again.")

        AccountOTP.objects.update_or_create(
            user=user,
            purpose=AccountOTP.PURPOSE_PASSWORD_RESET,
            defaults={
                "otp_hash": otp_hash,
                "otp_expires_at": otp_expires_at,
                "resend_available_at": resend_available_at,
                "failed_attempts": 0,
            },
        )

        logger.info("Password reset OTP sent to %s", user.email)
        return {"message": "Verification code sent to your email."}

    def change_password_with_otp(self, user: Any, otp: str, new_password: str) -> dict[str, Any]:
        """
        Verify the OTP and update the user's password.

        Every outstanding refresh token (all devices, including rotated ones)
        is blacklisted so a stolen session does not survive the new password;
        the caller gets a brand-new token pair so *this* browser stays signed in.
        Tokens are issued after the revocation inside the same transaction so
        they can never be caught by it.
        """
        record = AccountOTP.objects.filter(
            user=user, purpose=AccountOTP.PURPOSE_PASSWORD_RESET
        ).first()

        if not record:
            raise ValidationError("No active password reset request found. Please request a new code.")

        if self.otp_service.is_expired(record.otp_expires_at):
            record.delete()
            raise ValidationError("Verification code has expired. Please request a new one.")

        if self.otp_service.has_exceeded_max_attempts(record.failed_attempts):
            record.delete()
            raise ValidationError("Too many failed attempts. Please request a new code.")

        if not self.otp_service.verify_otp(otp, record.otp_hash):
            record.failed_attempts += 1
            record.save(update_fields=["failed_attempts"])
            remaining = OTP_MAX_FAILED_ATTEMPTS - record.failed_attempts
            if remaining <= 0:
                record.delete()
                raise ValidationError("Too many failed attempts. Please request a new code.")
            raise ValidationError(f"Invalid verification code. {remaining} attempt(s) remaining.")

        with transaction.atomic():
            user.set_password(new_password)
            user.save(update_fields=["password", "updated_at"])
            record.delete()
            self._revoke_all_sessions(user)
            tokens = self._issue_tokens(user)

        logger.info("Password updated and other sessions revoked for user %s", user.pk)
        return {"message": "Password updated successfully.", "tokens": tokens}

    def send_delete_account_otp(self, user: Any) -> dict[str, str]:
        """
        Send a 6-digit OTP to the user's email for confirming account deletion.
        Requires the user to have a password set first.
        """
        if not user.has_usable_password():
            raise ValidationError("Please set up a password first before proceeding with account deletion.")

        existing_otp = AccountOTP.objects.filter(
            user=user, purpose=AccountOTP.PURPOSE_DELETE_ACCOUNT
        ).first()

        if existing_otp and not self.otp_service.can_resend(existing_otp.resend_available_at):
            raise ValidationError("Please wait a moment before requesting another code.")

        otp = self.otp_service.generate_otp()
        otp_hash = self.otp_service.hash_otp(otp)
        otp_expires_at = self.otp_service.get_expiry_time()
        resend_available_at = self.otp_service.get_resend_available_time()

        try:
            self.email_service.send_account_deletion_email(user.email, user.full_name, otp)
        except Exception as e:
            logger.error("Failed to send account deletion email to %s: %s", user.email, e)
            raise ValidationError("Could not send email. Please verify email/SMTP settings and try again.")

        AccountOTP.objects.update_or_create(
            user=user,
            purpose=AccountOTP.PURPOSE_DELETE_ACCOUNT,
            defaults={
                "otp_hash": otp_hash,
                "otp_expires_at": otp_expires_at,
                "resend_available_at": resend_available_at,
                "failed_attempts": 0,
            },
        )

        logger.info("Account deletion OTP sent to %s", user.email)
        return {"message": "Account deletion verification code sent to your email."}

    def delete_account(self, user: Any, otp: str, password: str | None = None) -> dict[str, str]:
        """
        Verify password and OTP, then permanently delete the User and all associated data.
        """
        if not user.has_usable_password():
            raise ValidationError("Please set up a password first before proceeding with account deletion.")

        if not password or not user.check_password(password):
            raise ValidationError("Incorrect password.")

        record = AccountOTP.objects.filter(
            user=user, purpose=AccountOTP.PURPOSE_DELETE_ACCOUNT
        ).first()

        if not record:
            raise ValidationError("No active account deletion request found. Please request a new code.")

        if self.otp_service.is_expired(record.otp_expires_at):
            record.delete()
            raise ValidationError("Verification code has expired. Please request a new one.")

        if self.otp_service.has_exceeded_max_attempts(record.failed_attempts):
            record.delete()
            raise ValidationError("Too many failed attempts. Please request a new code.")

        if not self.otp_service.verify_otp(otp, record.otp_hash):
            record.failed_attempts += 1
            record.save(update_fields=["failed_attempts"])
            remaining = OTP_MAX_FAILED_ATTEMPTS - record.failed_attempts
            if remaining <= 0:
                record.delete()
                raise ValidationError("Too many failed attempts. Please request a new code.")
            raise ValidationError(f"Invalid verification code. {remaining} attempt(s) remaining.")

        email = user.email
        user.delete()
        logger.warning("User permanently deleted: %s", email)
        return {"message": "Your account has been permanently deleted."}

    # ------------------------------------------------------------------
    # Public Password Recovery (logged-out users)
    # ------------------------------------------------------------------

    RECOVERY_GENERIC_MESSAGE = (
        "If an account exists for that email, a password reset link has been sent."
    )

    def request_password_recovery(self, email: str) -> dict[str, str]:
        """
        Email a one-time password reset link to the account owner.

        Always returns the same generic message - for unknown and deactivated
        accounts *and* when the mail transport fails - so neither the response
        body, the status code nor an outage can be used to enumerate registered
        emails. Delivery problems are logged for operators only.
        """
        email = email.lower().strip()
        user = User.objects.filter(email=email, is_active=True).first()
        if user is None:
            logger.debug("Password recovery requested for an unknown or inactive account.")
            return {"message": self.RECOVERY_GENERIC_MESSAGE}

        uid = urlsafe_base64_encode(force_bytes(user.pk))
        token = default_token_generator.make_token(user)
        frontend_base = (getattr(settings, "FRONTEND_URL", "") or "https://zenflowbd.vercel.app").rstrip("/")
        reset_url = f"{frontend_base}/reset-password?uid={uid}&token={token}"

        if settings.DEBUG:
            # Development convenience only: the link (which embeds the reset
            # token) must never reach production logs.
            print(f"[ZenFlow] password-reset url={reset_url} email={email}", flush=True)

        try:
            self.email_service.send_password_recovery_email(
                to_email=user.email,
                full_name=user.full_name,
                reset_url=reset_url,
            )
        except Exception:  # noqa: BLE001 - any transport/provider failure
            # The token itself is not logged; `exception` records the provider error.
            logger.exception("Failed to send password recovery email for user %s", user.pk)
            return {"message": self.RECOVERY_GENERIC_MESSAGE}

        logger.info("Password recovery email sent for user %s", user.pk)
        return {"message": self.RECOVERY_GENERIC_MESSAGE}

    def _resolve_recovery_user(self, uid: str, token: str) -> User:
        try:
            user_pk = force_str(urlsafe_base64_decode(uid))
            user = User.objects.get(pk=user_pk, is_active=True)
        except (TypeError, ValueError, OverflowError, User.DoesNotExist, ValidationError):
            raise ValidationError("This password reset link is invalid or has expired.")

        if not default_token_generator.check_token(user, token):
            raise ValidationError("This password reset link is invalid or has expired.")
        return user

    def validate_password_recovery_token(self, uid: str, token: str) -> dict[str, Any]:
        """Let the frontend check a link before showing the new-password form."""
        user = self._resolve_recovery_user(uid, token)
        return {"valid": True, "email": user.email}

    def confirm_password_recovery(self, uid: str, token: str, new_password: str) -> dict[str, str]:
        """
        Verify the recovery link and set the new password. Every outstanding
        refresh token for the account is blacklisted so stolen sessions die
        with the old password.
        """
        user = self._resolve_recovery_user(uid, token)

        try:
            validate_password(new_password, user=user)
        except ValidationError as e:
            raise ValidationError(e.messages)

        with transaction.atomic():
            # Changing the hash also invalidates this (and any other
            # outstanding) recovery link, since the hash is part of the token.
            user.set_password(new_password)
            user.save(update_fields=["password", "updated_at"])
            self._revoke_all_sessions(user)

        logger.info("Password recovered via email link for user %s", user.pk)
        return {"message": "Your password has been reset. You can now log in."}

    # ------------------------------------------------------------------
    # Private Helpers
    # ------------------------------------------------------------------

    @staticmethod
    def _verify_google_id_token(id_token_str: str) -> dict[str, Any]:
        """
        Validate an ID token with google-auth. Fails closed when the client ID
        is not configured (there is nothing to check the audience against).
        """
        client_id = (getattr(settings, "GOOGLE_CLIENT_ID", "") or "").strip()
        if not client_id:
            logger.error("GOOGLE_CLIENT_ID is not configured; refusing Google sign-in.")
            raise GoogleAuthUnavailable("Google sign-in is not available right now.")

        try:
            id_info = google_id_token.verify_oauth2_token(
                id_token_str,
                google_requests.Request(),
                audience=client_id,
            )
        except ValueError as e:
            # Bad signature, expired, wrong audience or issuer: the caller's token is invalid.
            logger.warning("Google ID token rejected: %s", e)
            raise ValidationError("Invalid Google authentication token.")
        except Exception as e:  # noqa: BLE001 - transport/cert fetch failures
            logger.error("Google ID token verification unavailable: %s", e)
            raise GoogleAuthUnavailable(
                "Could not verify your Google sign-in right now. Please try again."
            )

        # google-auth already checks this; keep the explicit guard so the
        # contract does not depend on library internals.
        if id_info.get("iss") not in GOOGLE_ISSUERS:
            logger.warning("Google ID token rejected: unexpected issuer.")
            raise ValidationError("Invalid Google authentication token.")
        return id_info

    @staticmethod
    def _revoke_all_sessions(user: Any) -> None:
        """Blacklist every outstanding refresh token belonging to the user."""
        for outstanding in OutstandingToken.objects.filter(user=user):
            BlacklistedToken.objects.get_or_create(token=outstanding)

    @staticmethod
    def _issue_tokens(user: Any) -> dict[str, str]:
        """Generate JWT access and refresh tokens for the given user."""
        refresh = RefreshToken.for_user(user)
        return {
            "access": str(refresh.access_token),
            "refresh": str(refresh),
        }
