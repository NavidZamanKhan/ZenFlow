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
        self.from_email = from_email or getattr(
            settings, "RESEND_FROM_EMAIL", "ZenFlow <noreply@zenflow.navidzamankhan.com>"
        )

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

def _render_otp_email(
    title: str,
    full_name: str,
    otp: str,
    purpose: str,  # "verify" | "reset" | "delete"
    description: str,
    warning: str | None = None,
) -> tuple[str, str]:
    """
    Renders a clean, transparent, professional email template.
    - Transparent outer body (no gray box artifacts in Outlook/Gmail)
    - Clean slate card with subtle border
    - ZenFlow Blue for verification, Crimson Red for deletion
    """
    is_danger = purpose == "delete"
    code_color = "#f87171" if is_danger else "#60a5fa"
    code_bg = "rgba(239, 68, 68, 0.12)" if is_danger else "rgba(99, 102, 241, 0.12)"
    code_border = "rgba(239, 68, 68, 0.3)" if is_danger else "rgba(99, 102, 241, 0.3)"

    warning_html = ""
    if warning:
        warning_html = f"""
        <p style="margin: 16px 0 0 0; font-size: 13px; line-height: 1.5; color: #f87171; font-weight: 500;">
          <strong>Warning:</strong> {warning}
        </p>
        """

    html = f"""<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{title}</title>
</head>
<body style="margin: 0; padding: 24px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" align="center" style="max-width: 480px; margin: 0 auto;">
    <tr>
      <td style="padding: 0 12px;">
        <!-- Clean Floating Card -->
        <div style="background-color: #1e293b; border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 16px; padding: 32px 26px;">
          
          <!-- Brand Wordmark -->
          <div style="margin-bottom: 20px;">
            <span style="font-size: 20px; font-weight: 700; letter-spacing: -0.3px; color: #ffffff;">ZenFlow</span>
          </div>

          <!-- Greeting & Description -->
          <p style="margin: 0 0 12px 0; font-size: 15px; line-height: 1.5; color: #f8fafc;">
            Hi <strong>{full_name}</strong>,
          </p>
          <p style="margin: 0 0 20px 0; font-size: 14px; line-height: 1.6; color: #cbd5e1;">
            {description}
          </p>

          <!-- Clean OTP Box -->
          <div style="margin: 20px 0; padding: 16px 20px; background-color: {code_bg}; border: 1px solid {code_border}; border-radius: 12px; text-align: center;">
            <div style="font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; font-size: 32px; font-weight: 700; letter-spacing: 8px; color: {code_color}; user-select: all; -webkit-user-select: all;">
              {otp}
            </div>
          </div>

          <p style="margin: 0 0 8px 0; font-size: 13px; line-height: 1.5; color: #94a3b8;">
            This code will expire in <strong>5 minutes</strong>. If you didn't request this code, you can safely ignore this email.
          </p>

          {warning_html}

          <!-- Minimal Footer -->
          <hr style="border: none; border-top: 1px solid rgba(255, 255, 255, 0.08); margin: 24px 0 16px 0;">

          <p style="margin: 0; font-size: 12px; color: #64748b; line-height: 1.5;">
            ZenFlow &middot; Bring clarity to your day
          </p>
        </div>
      </td>
    </tr>
  </table>
</body>
</html>"""

    plain = f"ZenFlow: {title}\n\nHi {full_name},\n\n{description}\n\nYour Verification Code: {otp}\n\nThis code will expire in 5 minutes.\n"
    if warning:
        plain += f"\nWarning: {warning}\n"
    plain += "\nZenFlow Team"

    return html, plain


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
        self.from_email = from_email or getattr(
            settings, "RESEND_FROM_EMAIL", "ZenFlow <noreply@zenflow.navidzamankhan.com>"
        )

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
        html, plain = _render_otp_email(
            title="Verify Your Email",
            full_name=full_name,
            otp=otp,
            purpose="verify",
            description="Welcome to ZenFlow! Enter the 6-digit verification code below to activate your account:",
        )
        self._send(to_email, subject, html, plain)

    def send_password_reset_email(self, to_email: str, full_name: str, otp: str) -> None:
        subject = "ZenFlow: Password Reset Code"
        html, plain = _render_otp_email(
            title="Password Reset Code",
            full_name=full_name,
            otp=otp,
            purpose="reset",
            description="We received a request to reset your ZenFlow password. Enter this verification code to proceed:",
        )
        self._send(to_email, subject, html, plain)

    def send_account_deletion_email(self, to_email: str, full_name: str, otp: str) -> None:
        subject = "ZenFlow: Account Deletion Code"
        html, plain = _render_otp_email(
            title="Account Deletion Code",
            full_name=full_name,
            otp=otp,
            purpose="delete",
            description="You requested to permanently delete your ZenFlow account. Enter this verification code to confirm deletion:",
            warning="Entering this code will permanently delete your ZenFlow account and erase all your tasks, expenses, budgets, and events.",
        )
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
        html, plain = _render_otp_email(
            title="Verify Your Email",
            full_name=full_name,
            otp=otp,
            purpose="verify",
            description="Welcome to ZenFlow! Enter the 6-digit verification code below to activate your account:",
        )
        self._send(to_email, full_name, subject, html, plain)

    def send_password_reset_email(self, to_email: str, full_name: str, otp: str) -> None:
        subject = "ZenFlow: Password Reset Code"
        html, plain = _render_otp_email(
            title="Password Reset Code",
            full_name=full_name,
            otp=otp,
            purpose="reset",
            description="We received a request to reset your ZenFlow password. Enter this verification code to proceed:",
        )
        self._send(to_email, full_name, subject, html, plain)

    def send_account_deletion_email(self, to_email: str, full_name: str, otp: str) -> None:
        subject = "ZenFlow: Account Deletion Code"
        html, plain = _render_otp_email(
            title="Account Deletion Code",
            full_name=full_name,
            otp=otp,
            purpose="delete",
            description="You requested to permanently delete your ZenFlow account. Enter this verification code to confirm deletion:",
            warning="Entering this code will permanently delete your ZenFlow account and erase all your tasks, expenses, budgets, and events.",
        )
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

