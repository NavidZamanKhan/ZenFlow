from __future__ import annotations

from typing import Any

from django.contrib.auth.models import BaseUserManager


class UserManager(BaseUserManager):
    """
    Custom manager for User model where email is the unique identifier
    for authentication instead of username.
    """

    def normalize_email(self, email: str) -> str:
        """Normalize email by lowercasing and stripping whitespace."""
        if email:
            email = email.lower().strip()
        return super().normalize_email(email)

    def create_user(
        self,
        email: str,
        full_name: str,
        password: str | None = None,
        **extra_fields: Any,
    ) -> Any:
        """Create and return a regular user with an email and password."""
        if not email:
            raise ValueError("Users must have an email address.")
        if not full_name:
            raise ValueError("Users must have a full name.")

        email = self.normalize_email(email)
        user = self.model(email=email, full_name=full_name, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(
        self,
        email: str,
        full_name: str,
        password: str | None = None,
        **extra_fields: Any,
    ) -> Any:
        """Create and return a superuser with an email and password."""
        extra_fields.setdefault("is_staff", True)
        extra_fields.setdefault("is_superuser", True)
        extra_fields.setdefault("is_active", True)
        extra_fields.setdefault("email_verified", True)

        if extra_fields.get("is_staff") is not True:
            raise ValueError("Superuser must have is_staff=True.")
        if extra_fields.get("is_superuser") is not True:
            raise ValueError("Superuser must have is_superuser=True.")

        return self.create_user(email, full_name, password, **extra_fields)
