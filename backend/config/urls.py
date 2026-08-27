from django.conf import settings
from django.contrib import admin
from django.urls import path, include, re_path
from django.views.static import serve

urlpatterns = [
    path('admin/', admin.site.urls),

    path('api/auth/', include('users.urls')),
    path('api/tasks/', include('tasks.urls')),
    path('api/reminders/', include('reminders.urls')),
    path('api/expenses/', include('expenses.urls')),
    path('api/analytics/', include('analytics.urls')),
    path('api/events/', include('events.urls')),
    path('api/budget/', include('budget.urls')),
    re_path(r'^media/(?P<path>.*)$', serve, {'document_root': settings.MEDIA_ROOT}),
]