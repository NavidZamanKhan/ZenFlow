from django.core.exceptions import ValidationError
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from .serializers import (
    LoginSerializer,
    LogoutSerializer,
    RegisterSerializer,
    ResendOTPSerializer,
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
