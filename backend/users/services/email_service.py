from __future__ import annotations

import logging
from abc import ABC, abstractmethod

from django.conf import settings
from django.core.mail import send_mail
from django.template.loader import render_to_string

logger = logging.getLogger(__name__)


class BaseEmailService(ABC):
    """
    Abstract base class for email services.
    Swap the concrete implementation (SMTP → Resend) by changing
    the class instantiated in AuthService.
    """

    @abstractmethod
    def send_verification_email(
        self, to_email: str, full_name: str, otp: str
    ) -> None:
        """Send a registration verification email containing the OTP."""

    @abstractmethod
    def send_password_reset_email(
        self, to_email: str, full_name: str, otp: str
    ) -> None:
        """Send a password reset verification email containing the OTP."""

    @abstractmethod
    def send_account_deletion_email(
        self, to_email: str, full_name: str, otp: str
    ) -> None:
        """Send an account deletion confirmation email containing the OTP."""


class SMTPEmailService(BaseEmailService):
    """Concrete email service using Django's built-in SMTP backend."""

    def send_verification_email(
        self, to_email: str, full_name: str, otp: str
    ) -> None:
        """Send a verification email with the OTP code."""
        subject = "ZenFlow: Verify Your Email"
        plain_message = (
            f"Hi {full_name},\n\n"
            f"Your verification code is: {otp}\n\n"
            f"This code expires in 5 minutes.\n\n"
            f"If you did not create a ZenFlow account, "
            f"you can safely ignore this email.\n\n"
            f"Best regards,\n"
            f"The ZenFlow Team"
        )

        try:
            send_mail(
                subject=subject,
                message=plain_message,
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[to_email],
                fail_silently=False,
            )
            logger.info("Verification email sent to %s", to_email)
        except Exception:
            logger.exception("Failed to send verification email to %s", to_email)
            raise

    def send_password_reset_email(
        self, to_email: str, full_name: str, otp: str
    ) -> None:
        """Send a password reset code to the user."""
        subject = "ZenFlow: Password Reset Code"
        plain_message = (
            f"Hi {full_name},\n\n"
            f"Your password reset verification code is: {otp}\n\n"
            f"This code expires in 5 minutes.\n\n"
            f"If you did not request a password reset, please secure your account immediately.\n\n"
            f"Best regards,\n"
            f"The ZenFlow Team"
        )

        try:
            send_mail(
                subject=subject,
                message=plain_message,
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[to_email],
                fail_silently=False,
            )
            logger.info("Password reset email sent to %s", to_email)
        except Exception:
            logger.exception("Failed to send password reset email to %s", to_email)
            raise

    def send_account_deletion_email(
        self, to_email: str, full_name: str, otp: str
    ) -> None:
        """Send an account deletion verification code to the user."""
        subject = "ZenFlow: Account Deletion Code"
        plain_message = (
            f"Hi {full_name},\n\n"
            f"Your account deletion verification code is: {otp}\n\n"
            f"This code expires in 5 minutes.\n\n"
            f"Warning: Entering this code will permanently delete your ZenFlow account, "
            f"including all your tasks, expenses, budgets, and calendar data.\n\n"
            f"If you did not request this, please change your password immediately.\n\n"
            f"Best regards,\n"
            f"The ZenFlow Team"
        )

        try:
            send_mail(
                subject=subject,
                message=plain_message,
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[to_email],
                fail_silently=False,
            )
            logger.info("Account deletion email sent to %s", to_email)
        except Exception:
            logger.exception("Failed to send account deletion email to %s", to_email)
            raise


def get_email_service() -> BaseEmailService:
    """
    Factory function to return the configured email service.
    Change this when switching from SMTP to Resend or another provider.
    """
    return SMTPEmailService()

