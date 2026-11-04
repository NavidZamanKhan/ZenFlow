from django.contrib import admin

from .models import Reminder, ReminderNotification


@admin.register(Reminder)
class ReminderAdmin(admin.ModelAdmin):
    list_display = ("title", "user", "remind_at", "channel", "status", "sent_at", "email_attempts")
    list_filter = ("status", "channel")
    search_fields = ("title", "user__email")
    readonly_fields = (
        "sent_at",
        "last_error",
        "notification_sent_at",
        "email_sent_at",
        "email_attempts",
        "next_attempt_at",
        "created_at",
        "updated_at",
    )
    autocomplete_fields = ("user",)


@admin.register(ReminderNotification)
class ReminderNotificationAdmin(admin.ModelAdmin):
    list_display = ("title", "user", "created_at", "read_at")
    list_filter = ("read_at",)
    search_fields = ("title", "user__email")
    readonly_fields = ("created_at",)
