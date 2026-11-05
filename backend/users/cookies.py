"""
Helpers for issuing and revoking the httpOnly JWT cookies.
"""

from __future__ import annotations

from django.conf import settings
from rest_framework.response import Response


def _cookie_kwargs(path: str) -> dict:
    return {
        "path": path,
        "domain": settings.JWT_AUTH_COOKIE_DOMAIN,
        "secure": settings.JWT_AUTH_COOKIE_SECURE,
        "httponly": True,
        "samesite": settings.JWT_AUTH_COOKIE_SAMESITE,
    }


def set_auth_cookies(response: Response, access: str, refresh: str | None = None) -> Response:
    """Attach the access (and optionally refresh) token cookies to a response."""
    access_max_age = int(settings.SIMPLE_JWT["ACCESS_TOKEN_LIFETIME"].total_seconds())
    response.set_cookie(
        settings.JWT_AUTH_COOKIE,
        access,
        max_age=access_max_age,
        **_cookie_kwargs(settings.JWT_AUTH_COOKIE_PATH),
    )
    if refresh:
        refresh_max_age = int(settings.SIMPLE_JWT["REFRESH_TOKEN_LIFETIME"].total_seconds())
        response.set_cookie(
            settings.JWT_AUTH_REFRESH_COOKIE,
            refresh,
            max_age=refresh_max_age,
            **_cookie_kwargs(settings.JWT_AUTH_REFRESH_COOKIE_PATH),
        )
    return response


def clear_auth_cookies(response: Response) -> Response:
    """Expire both JWT cookies on the client."""
    response.delete_cookie(
        settings.JWT_AUTH_COOKIE,
        path=settings.JWT_AUTH_COOKIE_PATH,
        domain=settings.JWT_AUTH_COOKIE_DOMAIN,
        samesite=settings.JWT_AUTH_COOKIE_SAMESITE,
    )
    response.delete_cookie(
        settings.JWT_AUTH_REFRESH_COOKIE,
        path=settings.JWT_AUTH_REFRESH_COOKIE_PATH,
        domain=settings.JWT_AUTH_COOKIE_DOMAIN,
        samesite=settings.JWT_AUTH_COOKIE_SAMESITE,
    )
    return response


def get_refresh_token(request) -> str | None:
    """Refresh token from the httpOnly cookie, falling back to the request body."""
    token = request.COOKIES.get(settings.JWT_AUTH_REFRESH_COOKIE)
    if token:
        return token
    data = getattr(request, "data", None)
    if isinstance(data, dict):
        body_token = data.get("refresh")
        if isinstance(body_token, str) and body_token:
            return body_token
    return None
