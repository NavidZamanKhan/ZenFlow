from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import ReminderNotificationViewSet, ReminderViewSet

notifications_router = DefaultRouter()
notifications_router.register(r'', ReminderNotificationViewSet, basename='reminder-notification')

reminders_router = DefaultRouter()
reminders_router.register(r'', ReminderViewSet, basename='reminder')

urlpatterns = [
    # Must come before the reminders router so "notifications" is not read as a reminder pk.
    path('notifications/', include(notifications_router.urls)),
    path('', include(reminders_router.urls)),
]
