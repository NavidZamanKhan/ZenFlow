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


class ResendEmailService(BaseEmailService):
    """
    HTTP REST API email service using Resend (https://resend.com).
    Bypasses cloud host SMTP port restrictions (ports 25, 465, 587)
    by communicating directly over HTTPS (port 443).
    """

    def __init__(self, api_key: str | None = None, from_email: str | None = None) -> None:
        import requests
        self._requests = requests
        self.api_key = api_key or getattr(settings, "RESEND_API_KEY", "")
        self.from_email = from_email or getattr(settings, "RESEND_FROM_EMAIL", "ZenFlow <onboarding@resend.dev>")

    def _send(self, to_email: str, subject: str, html_body: str, plain_text: str) -> None:
        if not self.api_key:
            logger.error("RESEND_API_KEY is not configured.")
            raise ValueError("Email service is not configured (missing RESEND_API_KEY).")

        payload = {
            "from": self.from_email,
            "to": [to_email],
            "subject": subject,
            "html": html_body,
            "text": plain_text,
        }

        try:
            response = self._requests.post(
                "https://api.resend.com/emails",
                headers={
                    "Authorization": f"Bearer {self.api_key}",
                    "Content-Type": "application/json",
                },
                json=payload,
                timeout=getattr(settings, "EMAIL_TIMEOUT", 10),
            )
            if response.status_code >= 400:
                logger.error("Resend API error [%s]: %s", response.status_code, response.text)
                raise RuntimeError(f"Resend error ({response.status_code}): {response.text}")
            logger.info("Email sent via Resend API to %s", to_email)
        except Exception:
            logger.exception("Failed to send email via Resend to %s", to_email)
            raise

    def send_verification_email(self, to_email: str, full_name: str, otp: str) -> None:
        subject = "ZenFlow: Verify Your Email"
        plain = f"Hi {full_name},\n\nYour verification code is: {otp}\nExpires in 5 minutes."
        html = f"""
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px; background: #0f172a; color: #f8fafc; border-radius: 16px;">
            <h2 style="color: #6366f1; margin-top: 0;">ZenFlow</h2>
            <p>Hi <strong>{full_name}</strong>,</p>
            <p>Your verification code is:</p>
            <div style="text-align: center; margin: 24px 0;">
                <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px; padding: 12px 24px; background: rgba(99, 102, 241, 0.15); border: 1px solid #6366f1; border-radius: 12px; color: #818cf8; display: inline-block;">{otp}</span>
            </div>
            <p style="font-size: 13px; color: #94a3b8;">This code expires in 5 minutes. If you did not request this, you can safely ignore this email.</p>
        </div>
        """
        self._send(to_email, subject, html, plain)

    def send_password_reset_email(self, to_email: str, full_name: str, otp: str) -> None:
        subject = "ZenFlow: Password Reset Code"
        plain = f"Hi {full_name},\n\nYour password reset code is: {otp}\nExpires in 5 minutes."
        html = f"""
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px; background: #0f172a; color: #f8fafc; border-radius: 16px;">
            <h2 style="color: #6366f1; margin-top: 0;">ZenFlow</h2>
            <p>Hi <strong>{full_name}</strong>,</p>
            <p>Your password reset code is:</p>
            <div style="text-align: center; margin: 24px 0;">
                <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px; padding: 12px 24px; background: rgba(99, 102, 241, 0.15); border: 1px solid #6366f1; border-radius: 12px; color: #818cf8; display: inline-block;">{otp}</span>
            </div>
            <p style="font-size: 13px; color: #94a3b8;">This code expires in 5 minutes. If you did not request a password reset, please secure your account immediately.</p>
        </div>
        """
        self._send(to_email, subject, html, plain)

    def send_account_deletion_email(self, to_email: str, full_name: str, otp: str) -> None:
        subject = "ZenFlow: Account Deletion Code"
        plain = f"Hi {full_name},\n\nYour account deletion code is: {otp}\nExpires in 5 minutes."
        html = f"""
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px; background: #0f172a; color: #f8fafc; border-radius: 16px;">
            <h2 style="color: #ef4444; margin-top: 0;">ZenFlow Account Deletion</h2>
            <p>Hi <strong>{full_name}</strong>,</p>
            <p>You requested to permanently delete your ZenFlow account. Enter this verification code to confirm:</p>
            <div style="text-align: center; margin: 24px 0;">
                <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px; padding: 12px 24px; background: rgba(239, 68, 68, 0.15); border: 1px solid #ef4444; border-radius: 12px; color: #f87171; display: inline-block;">{otp}</span>
            </div>
            <p style="font-size: 13px; color: #f87171; font-weight: 500;">Warning: This will permanently delete your account, tasks, expenses, budgets, and events.</p>
            <p style="font-size: 13px; color: #94a3b8;">This code expires in 5 minutes.</p>
        </div>
        """
        self._send(to_email, subject, html, plain)


class BrevoEmailService(BaseEmailService):
    """
    HTTP REST API email service using Brevo (https://brevo.com).
    Bypasses cloud SMTP port bans and allows sending to ANY recipient
    email address (300 free emails/day) without requiring custom domain DNS verification.
    """

    def __init__(self, api_key: str | None = None, from_email: str | None = None) -> None:
        import requests
        self._requests = requests
        self.api_key = api_key or getattr(settings, "BREVO_API_KEY", "")
        self.from_email = from_email or getattr(settings, "EMAIL_HOST_USER", "mrnavid55@gmail.com")

    def _send(self, to_email: str, full_name: str, subject: str, html_body: str, plain_text: str) -> None:
        if not self.api_key:
            logger.error("BREVO_API_KEY is not configured.")
            raise ValueError("Email service is not configured (missing BREVO_API_KEY).")

        payload = {
            "sender": {"name": "ZenFlow", "email": self.from_email},
            "to": [{"email": to_email, "name": full_name or "ZenFlow User"}],
            "subject": subject,
            "htmlContent": html_body,
            "textContent": plain_text,
        }

        try:
            response = self._requests.post(
                "https://api.brevo.com/v3/smtp/email",
                headers={
                    "api-key": self.api_key,
                    "Content-Type": "application/json",
                    "Accept": "application/json",
                },
                json=payload,
                timeout=getattr(settings, "EMAIL_TIMEOUT", 10),
            )
            if response.status_code >= 400:
                logger.error("Brevo API error [%s]: %s", response.status_code, response.text)
                raise RuntimeError(f"Brevo error ({response.status_code}): {response.text}")
            logger.info("Email sent via Brevo API to %s", to_email)
        except Exception:
            logger.exception("Failed to send email via Brevo to %s", to_email)
            raise

    def send_verification_email(self, to_email: str, full_name: str, otp: str) -> None:
        subject = "ZenFlow: Verify Your Email"
        plain = f"Hi {full_name},\n\nYour verification code is: {otp}\nExpires in 5 minutes."
        html = f"""
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px; background: #0f172a; color: #f8fafc; border-radius: 16px;">
            <h2 style="color: #6366f1; margin-top: 0;">ZenFlow</h2>
            <p>Hi <strong>{full_name}</strong>,</p>
            <p>Your verification code is:</p>
            <div style="text-align: center; margin: 24px 0;">
                <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px; padding: 12px 24px; background: rgba(99, 102, 241, 0.15); border: 1px solid #6366f1; border-radius: 12px; color: #818cf8; display: inline-block;">{otp}</span>
            </div>
            <p style="font-size: 13px; color: #94a3b8;">This code expires in 5 minutes. If you did not request this, you can safely ignore this email.</p>
        </div>
        """
        self._send(to_email, full_name, subject, html, plain)

    def send_password_reset_email(self, to_email: str, full_name: str, otp: str) -> None:
        subject = "ZenFlow: Password Reset Code"
        plain = f"Hi {full_name},\n\nYour password reset code is: {otp}\nExpires in 5 minutes."
        html = f"""
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px; background: #0f172a; color: #f8fafc; border-radius: 16px;">
            <h2 style="color: #6366f1; margin-top: 0;">ZenFlow</h2>
            <p>Hi <strong>{full_name}</strong>,</p>
            <p>Your password reset code is:</p>
            <div style="text-align: center; margin: 24px 0;">
                <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px; padding: 12px 24px; background: rgba(99, 102, 241, 0.15); border: 1px solid #6366f1; border-radius: 12px; color: #818cf8; display: inline-block;">{otp}</span>
            </div>
            <p style="font-size: 13px; color: #94a3b8;">This code expires in 5 minutes. If you did not request a password reset, please secure your account immediately.</p>
        </div>
        """
        self._send(to_email, full_name, subject, html, plain)

    def send_account_deletion_email(self, to_email: str, full_name: str, otp: str) -> None:
        subject = "ZenFlow: Account Deletion Code"
        plain = f"Hi {full_name},\n\nYour account deletion code is: {otp}\nExpires in 5 minutes."
        html = f"""
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px; background: #0f172a; color: #f8fafc; border-radius: 16px;">
            <h2 style="color: #ef4444; margin-top: 0;">ZenFlow Account Deletion</h2>
            <p>Hi <strong>{full_name}</strong>,</p>
            <p>You requested to permanently delete your ZenFlow account. Enter this verification code to confirm:</p>
            <div style="text-align: center; margin: 24px 0;">
                <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px; padding: 12px 24px; background: rgba(239, 68, 68, 0.15); border: 1px solid #ef4444; border-radius: 12px; color: #f87171; display: inline-block;">{otp}</span>
            </div>
            <p style="font-size: 13px; color: #f87171; font-weight: 500;">Warning: This will permanently delete your account, tasks, expenses, budgets, and events.</p>
            <p style="font-size: 13px; color: #94a3b8;">This code expires in 5 minutes.</p>
        </div>
        """
        self._send(to_email, full_name, subject, html, plain)


def get_email_service() -> BaseEmailService:
    """
    Factory function to return the configured email service.
    1. Prefers Brevo when BREVO_API_KEY is configured (sends to any recipient email without custom domain verification).
    2. Uses Resend when RESEND_API_KEY is configured.
    3. Falls back to Django SMTP.
    """
    if getattr(settings, "BREVO_API_KEY", ""):
        return BrevoEmailService()
    if getattr(settings, "RESEND_API_KEY", ""):
        return ResendEmailService()
    return SMTPEmailService()

