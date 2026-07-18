from rest_framework import permissions, viewsets

from .models import Event
from .serializers import EventSerializer


class EventViewSet(viewsets.ModelViewSet):
    """CRUD for the authenticated user's own events only.

    Supports date-range querying so the calendar can fetch one visible
    range at a time instead of the user's entire event history:
    GET /api/events/?start=2026-07-01&end=2026-08-01
    """

    serializer_class = EventSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        queryset = Event.objects.filter(user=self.request.user)
        start = self.request.query_params.get('start')
        end = self.request.query_params.get('end')
        if start:
            queryset = queryset.filter(end_datetime__gte=start)
        if end:
            queryset = queryset.filter(start_datetime__lte=end)
        return queryset

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)
