"""
JWT authentication that accepts the access token either from the standard
``Authorization: Bearer`` header or from an httpOnly cookie.

Browser clients never see the token (it lives in an httpOnly cookie), so the
cookie path additionally enforces Django's CSRF protection using the
double-submit pattern: the request must carry an ``X-CSRFToken`` header that
matches the ``csrftoken`` cookie. Header-based clients (tests, scripts, native
apps) are exempt from CSRF, exactly like a classic bearer-token API.
"""

from __future__ import annotations

from django.conf import settings
from rest_framework import exceptions
from rest_framework.authentication import CSRFCheck
from rest_framework_simplejwt.authentication import JWTAuthentication


class CookieJWTAuthentication(JWTAuthentication):
    def authenticate(self, request):
        header = self.get_header(request)
        if header is not None:
            raw_token = self.get_raw_token(header)
            if raw_token is None:
                return None
            validated_token = self.get_validated_token(raw_token)
            return self.get_user(validated_token), validated_token

        raw_token = request.COOKIES.get(settings.JWT_AUTH_COOKIE)
        if not raw_token:
            return None

        validated_token = self.get_validated_token(raw_token)
        user = self.get_user(validated_token)
        self.enforce_csrf(request)
        return user, validated_token

    @staticmethod
    def enforce_csrf(request) -> None:
        """Mirror of ``SessionAuthentication.enforce_csrf``."""

        def dummy_get_response(_request):  # pragma: no cover - required signature
            return None

        check = CSRFCheck(dummy_get_response)
        check.process_request(request)
        reason = check.process_view(request, None, (), {})
        if reason:
            raise exceptions.PermissionDenied(f"CSRF Failed: {reason}")
