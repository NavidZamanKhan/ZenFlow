import logging

from django.conf import settings
from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from django.middleware.csrf import get_token
from rest_framework import status
from rest_framework.exceptions import AuthenticationFailed
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError
from rest_framework_simplejwt.serializers import TokenRefreshSerializer

from .authentication import CookieJWTAuthentication
from .cookies import clear_auth_cookies, get_refresh_token, set_auth_cookies
from .serializers import (
    ChangePasswordWithOTPSerializer,
    DeleteAccountSerializer,
    GoogleAuthSerializer,
    LoginSerializer,
    LogoutSerializer,
    PasswordRecoveryConfirmSerializer,
    PasswordRecoveryRequestSerializer,
    PasswordRecoveryTokenSerializer,
    RegisterSerializer,
    ResendOTPSerializer,
    SetPasswordSerializer,
    UpdateProfileSerializer,
    UserSerializer,
    VerifyEmailSerializer,
)
from .services.auth_service import AuthService, GoogleAuthUnavailable

logger = logging.getLogger(__name__)

User = get_user_model()


def _session_response(request: Request, result: dict, http_status: int = status.HTTP_200_OK) -> Response:
    """
    Turn an AuthService result (``{"tokens": {...}, "user": {...}}``) into a
    response that carries the JWTs as httpOnly cookies. Tokens are *not*
    echoed in the body; the body returns the user plus a CSRF token the
    frontend must send back as ``X-CSRFToken`` on mutating requests.
    """
    tokens = result.pop("tokens", {}) or {}
    body = {**result, "csrfToken": get_token(request)}
    response = Response(body, status=http_status)
    if tokens.get("access"):
        set_auth_cookies(response, tokens["access"], tokens.get("refresh"))
    return response


def _enforce_csrf(request: Request) -> None:
    """
    Apply Django's CSRF check (double-submit cookie + Origin/Referer) to an
    endpoint that *establishes* a cookie session and therefore has no
    authenticated principal yet. Without it a cross-site page could log the
    victim into an attacker's account (login CSRF). The frontend already sends
    ``X-CSRFToken`` on every unsafe request. Raises ``PermissionDenied`` (403).
    """
    CookieJWTAuthentication.enforce_csrf(request)


class CsrfTokenView(APIView):
    """
    GET /api/auth/csrf/
    Issue (or refresh) the CSRF cookie and return its token for the
    double-submit header. Safe to call anonymously.
    """

    permission_classes = [AllowAny]
    authentication_classes = []

    def get(self, request: Request) -> Response:
        return Response({"csrfToken": get_token(request)}, status=status.HTTP_200_OK)


class RegisterView(APIView):
    """
    POST /api/auth/register/
    Create a PendingRegistration and send OTP email.
    """

    permission_classes = [AllowAny]
    authentication_classes = []
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "auth"

    def post(self, request: Request) -> Response:
        serializer = RegisterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        service = AuthService()
        try:
            result = service.register(
                full_name=serializer.validated_data["full_name"],
                email=serializer.validated_data["email"],
                password=serializer.validated_data["password"],
            )
        except ValidationError as e:
            return Response(
                {"errors": e.messages if hasattr(e, "messages") else [str(e)]},
                status=status.HTTP_400_BAD_REQUEST,
            )

        return Response(result, status=status.HTTP_201_CREATED)


class VerifyEmailView(APIView):
    """
    POST /api/auth/verify-email/
    Verify OTP, create User, return JWT tokens. CSRF-protected (session-establishing).
    """

    permission_classes = [AllowAny]
    authentication_classes = []
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "auth"

    def post(self, request: Request) -> Response:
        _enforce_csrf(request)
        serializer = VerifyEmailSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        service = AuthService()
        try:
            result = service.verify_email(
                pending_registration_id=str(
                    serializer.validated_data["pending_registration_id"]
                ),
                otp=serializer.validated_data["otp"],
            )
        except ValidationError as e:
            return Response(
                {"errors": e.messages if hasattr(e, "messages") else [str(e)]},
                status=status.HTTP_400_BAD_REQUEST,
            )

        return _session_response(request, result)


class ResendOTPView(APIView):
    """
    POST /api/auth/resend-otp/
    Resend a new OTP for a pending registration.
    """

    permission_classes = [AllowAny]
    authentication_classes = []
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "auth"

    def post(self, request: Request) -> Response:
        serializer = ResendOTPSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        service = AuthService()
        try:
            result = service.resend_otp(
                pending_registration_id=str(
                    serializer.validated_data["pending_registration_id"]
                ),
            )
        except ValidationError as e:
            return Response(
                {"errors": e.messages if hasattr(e, "messages") else [str(e)]},
                status=status.HTTP_400_BAD_REQUEST,
            )

        return Response(result, status=status.HTTP_200_OK)


class LoginView(APIView):
    """
    POST /api/auth/login/
    Authenticate user, set the session cookies. CSRF-protected (login CSRF).
    """

    permission_classes = [AllowAny]
    authentication_classes = []
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "auth"

    def post(self, request: Request) -> Response:
        _enforce_csrf(request)
        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        service = AuthService()
        try:
            result = service.login(
                email=serializer.validated_data["email"],
                password=serializer.validated_data["password"],
            )
        except ValidationError as e:
            return Response(
                {"errors": e.messages if hasattr(e, "messages") else [str(e)]},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        return _session_response(request, result)


class GoogleAuthView(APIView):
    """
    POST /api/auth/google/
    Authenticate with a Google ID token (audience-checked, email must be
    verified by Google), return the session cookies.
    """

    permission_classes = [AllowAny]
    authentication_classes = []
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "auth"

    def post(self, request: Request) -> Response:
        _enforce_csrf(request)
        serializer = GoogleAuthSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        service = AuthService()
        try:
            result = service.google_auth(id_token_str=serializer.validated_data["id_token"])
        except GoogleAuthUnavailable as e:
            return Response(
                {"errors": e.messages if hasattr(e, "messages") else [str(e)]},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )
        except ValidationError as e:
            return Response(
                {"errors": e.messages if hasattr(e, "messages") else [str(e)]},
                status=status.HTTP_400_BAD_REQUEST,
            )

        return _session_response(request, result)


class CookieTokenRefreshView(APIView):
    """
    POST /api/auth/refresh/
    Rotate the refresh token (read from the httpOnly cookie, or the body for
    header-based clients) and re-issue both cookies. The previous refresh
    token is blacklisted by SimpleJWT's rotation settings.

    When the token arrives in the cookie the request is CSRF-checked, exactly
    like other cookie-authenticated unsafe requests; body-supplied tokens
    (non-browser clients) are exempt, mirroring the Bearer-header rule.
    Any rejection answers 401 *and* expires both cookies so a browser never
    keeps a dead session around.
    """

    permission_classes = [AllowAny]
    authentication_classes = []

    def post(self, request: Request) -> Response:
        if request.COOKIES.get(settings.JWT_AUTH_REFRESH_COOKIE):
            _enforce_csrf(request)

        refresh = get_refresh_token(request)
        if not refresh:
            response = Response(
                {"errors": ["No refresh token provided."]},
                status=status.HTTP_401_UNAUTHORIZED,
            )
            return clear_auth_cookies(response)

        serializer = TokenRefreshSerializer(data={"refresh": refresh})
        try:
            serializer.is_valid(raise_exception=True)
        except (InvalidToken, TokenError, AuthenticationFailed, User.DoesNotExist) as e:
            # AuthenticationFailed: the account behind the token is no longer
            # active. User.DoesNotExist: the account was deleted since the token
            # was issued. Both return 401 and clear the dead cookies.
            response = Response(
                {"errors": [str(getattr(e, "detail", None) or "Invalid or expired token.")]},
                status=status.HTTP_401_UNAUTHORIZED,
            )
            return clear_auth_cookies(response)

        data = serializer.validated_data
        response = Response(
            {"detail": "Session refreshed.", "csrfToken": get_token(request)},
            status=status.HTTP_200_OK,
        )
        return set_auth_cookies(response, data["access"], data.get("refresh"))


class LogoutView(APIView):
    """
    POST /api/auth/logout/
    Blacklist the refresh token and expire both JWT cookies.
    """

    permission_classes = [IsAuthenticated]

    def post(self, request: Request) -> Response:
        serializer = LogoutSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        refresh = get_refresh_token(request)
        if not refresh:
            # Nothing to blacklist (e.g. access-only client); still end the session.
            response = Response({"detail": "Successfully logged out."}, status=status.HTTP_200_OK)
            return clear_auth_cookies(response)

        service = AuthService()
        try:
            result = service.logout(refresh_token=refresh)
        except ValidationError as e:
            response = Response(
                {"errors": e.messages if hasattr(e, "messages") else [str(e)]},
                status=status.HTTP_400_BAD_REQUEST,
            )
            return clear_auth_cookies(response)

        response = Response(result, status=status.HTTP_200_OK)
        return clear_auth_cookies(response)


class MeView(APIView):
    """
    GET /api/auth/me/ - Return the currently authenticated user.
    PATCH /api/auth/me/ - Update full_name and/or avatar for authenticated user.
    """

    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get(self, request: Request) -> Response:
        serializer = UserSerializer(request.user, context={"request": request})
        return Response(serializer.data, status=status.HTTP_200_OK)

    def patch(self, request: Request) -> Response:
        serializer = UpdateProfileSerializer(
            request.user,
            data=request.data,
            partial=True,
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()

        response_serializer = UserSerializer(request.user, context={"request": request})
        return Response(response_serializer.data, status=status.HTTP_200_OK)


class SetPasswordView(APIView):
    """
    POST /api/auth/password/set/
    Set password for an account that currently has no usable password.
    """

    permission_classes = [IsAuthenticated]

    def post(self, request: Request) -> Response:
        serializer = SetPasswordSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        service = AuthService()
        try:
            user = service.set_password(
                user=request.user,
                new_password=serializer.validated_data["new_password"],
            )
        except ValidationError as e:
            return Response(
                {"errors": e.messages if hasattr(e, "messages") else [str(e)]},
                status=status.HTTP_400_BAD_REQUEST,
            )

        return Response(
            {
                "message": "Password set successfully.",
                "user": UserSerializer(user).data,
            },
            status=status.HTTP_200_OK,
        )


class PasswordResetOTPView(APIView):
    """
    POST /api/auth/password/otp/
    Send 6-digit OTP for resetting/changing password.
    """

    permission_classes = [IsAuthenticated]

    def post(self, request: Request) -> Response:
        service = AuthService()
        try:
            result = service.send_password_reset_otp(user=request.user)
        except ValidationError as e:
            return Response(
                {"errors": e.messages if hasattr(e, "messages") else [str(e)]},
                status=status.HTTP_400_BAD_REQUEST,
            )

        return Response(result, status=status.HTTP_200_OK)


class ResetPasswordWithOTPView(APIView):
    """
    POST /api/auth/password/reset/
    Verify OTP and change/reset the user's password. Every other session is
    revoked; this browser receives fresh session cookies and stays logged in.
    """

    permission_classes = [IsAuthenticated]

    def post(self, request: Request) -> Response:
        serializer = ChangePasswordWithOTPSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        service = AuthService()
        try:
            result = service.change_password_with_otp(
                user=request.user,
                otp=serializer.validated_data["otp"],
                new_password=serializer.validated_data["new_password"],
            )
        except ValidationError as e:
            return Response(
                {"errors": e.messages if hasattr(e, "messages") else [str(e)]},
                status=status.HTTP_400_BAD_REQUEST,
            )

        return _session_response(request, result)


class DeleteAccountOTPView(APIView):
    """
    POST /api/auth/delete-account/otp/
    Send 6-digit OTP for confirming account deletion.
    """

    permission_classes = [IsAuthenticated]

    def post(self, request: Request) -> Response:
        service = AuthService()
        try:
            result = service.send_delete_account_otp(user=request.user)
        except ValidationError as e:
            return Response(
                {"errors": e.messages if hasattr(e, "messages") else [str(e)]},
                status=status.HTTP_400_BAD_REQUEST,
            )

        return Response(result, status=status.HTTP_200_OK)


class DeleteAccountView(APIView):
    """
    POST /api/auth/delete-account/
    Verify password and OTP, then permanently delete user and workspace data.
    """

    permission_classes = [IsAuthenticated]

    def post(self, request: Request) -> Response:
        serializer = DeleteAccountSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        service = AuthService()
        try:
            result = service.delete_account(
                user=request.user,
                otp=serializer.validated_data["otp"],
                password=serializer.validated_data.get("password"),
            )
        except ValidationError as e:
            return Response(
                {"errors": e.messages if hasattr(e, "messages") else [str(e)]},
                status=status.HTTP_400_BAD_REQUEST,
            )

        response = Response(result, status=status.HTTP_200_OK)
        return clear_auth_cookies(response)


# ----------------------------------------------------------------------
# Public password recovery (no authentication required)
# ----------------------------------------------------------------------


class PasswordRecoveryRequestView(APIView):
    """
    POST /api/auth/password/forgot/
    Email a one-time reset link. Always answers 200 with the same generic
    message (unknown email, inactive account or mail failure alike) so the
    endpoint cannot be used to enumerate accounts. Rate-limited per client IP.
    """

    permission_classes = [AllowAny]
    authentication_classes = []
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "password_recovery"

    def post(self, request: Request) -> Response:
        serializer = PasswordRecoveryRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        result = AuthService().request_password_recovery(
            email=serializer.validated_data["email"],
        )
        return Response(result, status=status.HTTP_200_OK)


class PasswordRecoveryValidateView(APIView):
    """
    POST /api/auth/password/forgot/validate/
    Check that a (uid, token) pair from a recovery link is still usable so the
    frontend can show the form (or a helpful error) before the user types.
    Shares the recovery rate limit so links cannot be probed without bound.
    """

    permission_classes = [AllowAny]
    authentication_classes = []
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "password_recovery"

    def post(self, request: Request) -> Response:
        serializer = PasswordRecoveryTokenSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        service = AuthService()
        try:
            result = service.validate_password_recovery_token(
                uid=serializer.validated_data["uid"],
                token=serializer.validated_data["token"],
            )
        except ValidationError as e:
            return Response(
                {"valid": False, "errors": e.messages if hasattr(e, "messages") else [str(e)]},
                status=status.HTTP_400_BAD_REQUEST,
            )

        return Response(result, status=status.HTTP_200_OK)


class PasswordRecoveryConfirmView(APIView):
    """
    POST /api/auth/password/forgot/confirm/
    Set a new password using the recovery link; revokes all existing sessions.
    """

    permission_classes = [AllowAny]
    authentication_classes = []
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "password_recovery"

    def post(self, request: Request) -> Response:
        serializer = PasswordRecoveryConfirmSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        service = AuthService()
        try:
            result = service.confirm_password_recovery(
                uid=serializer.validated_data["uid"],
                token=serializer.validated_data["token"],
                new_password=serializer.validated_data["new_password"],
            )
        except ValidationError as e:
            return Response(
                {"errors": e.messages if hasattr(e, "messages") else [str(e)]},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # The caller is logged out everywhere, including this browser.
        response = Response(result, status=status.HTTP_200_OK)
        return clear_auth_cookies(response)

