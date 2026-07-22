from __future__ import annotations

import secrets
from datetime import timedelta

from django.contrib.auth.hashers import check_password, make_password
from django.utils import timezone


# OTP Configuration
OTP_LENGTH = 6
OTP_EXPIRY_MINUTES = 5
OTP_RESEND_COOLDOWN_SECONDS = 60
OTP_MAX_FAILED_ATTEMPTS = 5


class OTPService:
    """Handles OTP generation, hashing, verification, and cooldown logic."""

    @staticmethod
    def generate_otp() -> str:
        """Generate a cryptographically secure random 6-digit OTP."""
        # Generate a number between 0 and 999999, zero-padded to 6 digits
        otp = secrets.randbelow(10**OTP_LENGTH)
        return str(otp).zfill(OTP_LENGTH)

    @staticmethod
    def hash_otp(otp: str) -> str:
        """Hash the OTP using Django's make_password (Argon2id)."""
        return make_password(otp)

    @staticmethod
    def verify_otp(plain_otp: str, hashed_otp: str) -> bool:
        """Verify the OTP against the stored hash using check_password."""
        return check_password(plain_otp, hashed_otp)

    @staticmethod
    def get_expiry_time() -> timezone.datetime:
        """Return the OTP expiration datetime."""
        return timezone.now() + timedelta(minutes=OTP_EXPIRY_MINUTES)

    @staticmethod
    def get_resend_available_time() -> timezone.datetime:
        """Return the datetime when resend becomes available."""
        return timezone.now() + timedelta(seconds=OTP_RESEND_COOLDOWN_SECONDS)

    @staticmethod
    def is_expired(otp_expires_at: timezone.datetime) -> bool:
        """Check if the OTP has expired."""
        return timezone.now() >= otp_expires_at

    @staticmethod
    def can_resend(resend_available_at: timezone.datetime) -> bool:
        """Check if the resend cooldown has passed."""
        return timezone.now() >= resend_available_at

    @staticmethod
    def has_exceeded_max_attempts(failed_attempts: int) -> bool:
        """Check if the maximum number of failed attempts has been reached."""
        return failed_attempts >= OTP_MAX_FAILED_ATTEMPTS
