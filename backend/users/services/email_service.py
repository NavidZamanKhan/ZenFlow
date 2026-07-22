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
        """Send a verification email containing the OTP."""


class SMTPEmailService(BaseEmailService):
    """Concrete email service using Django's built-in SMTP backend."""

    def send_verification_email(
        self, to_email: str, full_name: str, otp: str
    ) -> None:
        """Send a verification email with the OTP code."""
        subject = "ZenFlow — Verify Your Email"
        plain_message = (
            f"Hi {full_name},\n\n"
            f"Your verification code is: {otp}\n\n"
            f"This code expires in 5 minutes.\n\n"
            f"If you didn't create a ZenFlow account, "
            f"you can safely ignore this email.\n\n"
            f"— The ZenFlow Team"
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


def get_email_service() -> BaseEmailService:
    """
    Factory function to return the configured email service.
    Change this when switching from SMTP to Resend or another provider.
    """
    return SMTPEmailService()
