import uuid

from django.contrib.auth.models import AbstractBaseUser, PermissionsMixin
from django.db import models

from .managers import UserManager


class User(AbstractBaseUser, PermissionsMixin):
    """
    Custom User model using email as the unique identifier.
    No username field.
    """

    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
    )
    email = models.EmailField(
        max_length=254,
        unique=True,
        db_index=True,
    )
    full_name = models.CharField(max_length=150)
    avatar = models.ImageField(
        upload_to="avatars/",
        null=True,
        blank=True,
    )
    email_verified = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)
    date_joined = models.DateTimeField(auto_now_add=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    objects = UserManager()

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = ["full_name"]

    class Meta:
        verbose_name = "user"
        verbose_name_plural = "users"

    def __str__(self) -> str:
        return self.email


class PendingRegistration(models.Model):
    """
    Holds registration data before email verification.
    The real User is created only after OTP verification succeeds.
    """

    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
    )
    full_name = models.CharField(max_length=150)
    email = models.EmailField(
        max_length=254,
        unique=True,
        db_index=True,
    )
    hashed_password = models.CharField(max_length=255)
    otp_hash = models.CharField(max_length=255)
    otp_expires_at = models.DateTimeField()
    resend_available_at = models.DateTimeField()
    failed_attempts = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "pending registration"
        verbose_name_plural = "pending registrations"

    def __str__(self) -> str:
        return f"PendingRegistration({self.email})"
