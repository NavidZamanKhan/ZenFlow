from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin

from .models import PendingRegistration, User


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    """Admin configuration for the custom User model."""

    model = User
    list_display = (
        "email",
        "full_name",
        "email_verified",
        "is_active",
        "is_staff",
        "date_joined",
    )
    list_filter = ("is_active", "is_staff", "email_verified")
    search_fields = ("email", "full_name")
    ordering = ("-date_joined",)

    # Fields displayed when viewing/editing an existing user
    fieldsets = (
        (None, {"fields": ("email", "password")}),
        ("Personal Info", {"fields": ("full_name", "avatar")}),
        (
            "Permissions",
            {
                "fields": (
                    "is_active",
                    "is_staff",
                    "is_superuser",
                    "email_verified",
                    "groups",
                    "user_permissions",
                ),
            },
        ),
        ("Important dates", {"fields": ("last_login",)}),
    )

    # Fields displayed when creating a new user via admin
    add_fieldsets = (
        (
            None,
            {
                "classes": ("wide",),
                "fields": (
                    "email",
                    "full_name",
                    "password1",
                    "password2",
                    "is_active",
                    "is_staff",
                ),
            },
        ),
    )


@admin.register(PendingRegistration)
class PendingRegistrationAdmin(admin.ModelAdmin):
    """Admin configuration for PendingRegistration model."""

    list_display = (
        "email",
        "full_name",
        "failed_attempts",
        "otp_expires_at",
        "created_at",
    )
    list_filter = ("failed_attempts",)
    search_fields = ("email", "full_name")
    ordering = ("-created_at",)
    readonly_fields = (
        "id",
        "hashed_password",
        "otp_hash",
        "created_at",
    )
