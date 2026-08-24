from django.core.exceptions import ValidationError
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from .serializers import (
    ChangePasswordWithOTPSerializer,
    DeleteAccountSerializer,
    GoogleAuthSerializer,
    LoginSerializer,
    LogoutSerializer,
    RegisterSerializer,
    ResendOTPSerializer,
    SetPasswordSerializer,
    UserSerializer,
    VerifyEmailSerializer,
)
from .services.auth_service import AuthService


class RegisterView(APIView):
    """
    POST /api/auth/register/
    Create a PendingRegistration and send OTP email.
    """

    permission_classes = [AllowAny]
    authentication_classes = []

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
    Verify OTP, create User, return JWT tokens.
    """

    permission_classes = [AllowAny]
    authentication_classes = []

    def post(self, request: Request) -> Response:
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

        return Response(result, status=status.HTTP_200_OK)


class ResendOTPView(APIView):
    """
    POST /api/auth/resend-otp/
    Resend a new OTP for a pending registration.
    """

    permission_classes = [AllowAny]
    authentication_classes = []

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
    Authenticate user, return JWT tokens.
    """

    permission_classes = [AllowAny]
    authentication_classes = []

    def post(self, request: Request) -> Response:
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

        return Response(result, status=status.HTTP_200_OK)


class GoogleAuthView(APIView):
    """
    POST /api/auth/google/
    Authenticate with Google OAuth ID token, return JWT tokens.
    """

    permission_classes = [AllowAny]
    authentication_classes = []

    def post(self, request: Request) -> Response:
        serializer = GoogleAuthSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        service = AuthService()
        try:
            result = service.google_auth(
                id_token_str=serializer.validated_data.get("id_token"),
                access_token_str=serializer.validated_data.get("access_token"),
            )
        except ValidationError as e:
            return Response(
                {"errors": e.messages if hasattr(e, "messages") else [str(e)]},
                status=status.HTTP_400_BAD_REQUEST,
            )

        return Response(result, status=status.HTTP_200_OK)


class LogoutView(APIView):
    """
    POST /api/auth/logout/
    Blacklist the refresh token.
    """

    permission_classes = [IsAuthenticated]

    def post(self, request: Request) -> Response:
        serializer = LogoutSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        service = AuthService()
        try:
            result = service.logout(
                refresh_token=serializer.validated_data["refresh"],
            )
        except ValidationError as e:
            return Response(
                {"errors": e.messages if hasattr(e, "messages") else [str(e)]},
                status=status.HTTP_400_BAD_REQUEST,
            )

        return Response(result, status=status.HTTP_200_OK)


class MeView(APIView):
    """
    GET /api/auth/me/
    Return the currently authenticated user.
    """

    permission_classes = [IsAuthenticated]

    def get(self, request: Request) -> Response:
        serializer = UserSerializer(request.user)
        return Response(serializer.data, status=status.HTTP_200_OK)


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
    Verify OTP and change/reset the user's password.
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

        return Response(result, status=status.HTTP_200_OK)


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

        return Response(result, status=status.HTTP_200_OK)

