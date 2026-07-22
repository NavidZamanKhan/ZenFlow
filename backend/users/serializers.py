from __future__ import annotations

import re

from django.contrib.auth import get_user_model
from rest_framework import serializers

User = get_user_model()

# Password complexity pattern (matches validator logic)
PASSWORD_SPECIAL_CHARS = r"[!@#$%^&*()_+\-=\[\]{};':\"\\|,.<>\/?`~]"


class RegisterSerializer(serializers.Serializer):
    """Validates registration input: full_name, email, password, confirm_password."""

    full_name = serializers.CharField(max_length=150, min_length=1)
    email = serializers.EmailField(max_length=254)
    password = serializers.CharField(min_length=8, write_only=True)
    confirm_password = serializers.CharField(min_length=8, write_only=True)

    def validate_email(self, value: str) -> str:
        """Normalize email to lowercase and strip whitespace."""
        return value.lower().strip()

    def validate_full_name(self, value: str) -> str:
        """Strip whitespace from full name."""
        return value.strip()

    def validate_password(self, value: str) -> str:
        """Validate password complexity."""
        errors = []

        if not re.search(r"[A-Z]", value):
            errors.append("Password must contain at least one uppercase letter.")

        if not re.search(r"[a-z]", value):
            errors.append("Password must contain at least one lowercase letter.")

        if not re.search(r"\d", value):
            errors.append("Password must contain at least one digit.")

        if not re.search(PASSWORD_SPECIAL_CHARS, value):
            errors.append("Password must contain at least one special character.")

        if errors:
            raise serializers.ValidationError(errors)

        return value

    def validate(self, attrs: dict) -> dict:
        """Ensure passwords match."""
        if attrs["password"] != attrs["confirm_password"]:
            raise serializers.ValidationError(
                {"confirm_password": "Passwords do not match."}
            )
        return attrs


class VerifyEmailSerializer(serializers.Serializer):
    """Validates OTP verification input."""

    pending_registration_id = serializers.UUIDField()
    otp = serializers.CharField(min_length=6, max_length=6)

    def validate_otp(self, value: str) -> str:
        """Ensure OTP contains only digits."""
        if not value.isdigit():
            raise serializers.ValidationError(
                "Verification code must contain only digits."
            )
        return value


class ResendOTPSerializer(serializers.Serializer):
    """Validates resend OTP input."""

    pending_registration_id = serializers.UUIDField()


class LoginSerializer(serializers.Serializer):
    """Validates login input."""

    email = serializers.EmailField(max_length=254)
    password = serializers.CharField(write_only=True)

    def validate_email(self, value: str) -> str:
        """Normalize email to lowercase and strip whitespace."""
        return value.lower().strip()


class LogoutSerializer(serializers.Serializer):
    """Validates logout input — expects the refresh token."""

    refresh = serializers.CharField()


class UserSerializer(serializers.ModelSerializer):
    """Read-only serializer for returning user data in responses."""

    class Meta:
        model = User
        fields = [
            "id",
            "email",
            "full_name",
            "avatar",
            "email_verified",
            "date_joined",
            "created_at",
            "updated_at",
        ]
        read_only_fields = fields
