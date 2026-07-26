from django.db import transaction
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Budget
from .serializers import (
    BudgetSerializer,
    RecordAlertsRequestSerializer,
)


class BudgetDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        budget, _ = Budget.objects.get_or_create(user=request.user)
        serializer = BudgetSerializer(budget)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def put(self, request):
        budget, _ = Budget.objects.get_or_create(user=request.user)
        serializer = BudgetSerializer(budget, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class RecordAlertsView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = RecordAlertsRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        month = serializer.validated_data['month']
        alerts = serializer.validated_data['alerts']

        with transaction.atomic():
            budget, _ = Budget.objects.select_for_update().get_or_create(user=request.user)
            history = dict(budget.alerted_thresholds) if budget.alerted_thresholds else {}
            month_history = history.get(month, {})
            if not isinstance(month_history, dict):
                month_history = {}

            newly_recorded = []
            for item in alerts:
                category = item['category']
                threshold = item['threshold']
                existing = month_history.get(category, [])
                if not isinstance(existing, list):
                    existing = []
                if threshold not in existing:
                    month_history[category] = existing + [threshold]
                    newly_recorded.append({'category': category, 'threshold': threshold})

            if newly_recorded:
                history[month] = month_history
                budget.alerted_thresholds = history
                budget.save(update_fields=['alerted_thresholds', 'updated_at'])

        return Response({'recorded': newly_recorded}, status=status.HTTP_200_OK)
