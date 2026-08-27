from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import path, include

urlpatterns = [
    path('admin/', admin.site.urls),

    path('api/auth/', include('users.urls')),
    path('api/tasks/', include('tasks.urls')),
    path('api/reminders/', include('reminders.urls')),
    path('api/expenses/', include('expenses.urls')),
    path('api/analytics/', include('analytics.urls')),
    path('api/events/', include('events.urls')),
    path('api/budget/', include('budget.urls')),
]

if settings.MEDIA_URL and settings.MEDIA_ROOT:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)