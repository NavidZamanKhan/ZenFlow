from django.contrib import admin
from django.urls import path, include

urlpatterns = [
    path('admin/', admin.site.urls),

    path('api/users/', include('users.urls')),
    path('api/tasks/', include('tasks.urls')),
    path('api/reminders/', include('reminders.urls')),
    path('api/expenses/', include('expenses.urls')),
    path('api/analytics/', include('analytics.urls')),
    path('api/events/', include('events.urls')),
]