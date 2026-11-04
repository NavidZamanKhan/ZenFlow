from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .serializers import AnalyticsSummaryQuerySerializer
from .services import build_expense_summary


class AnalyticsSummaryView(APIView):
    """
    GET /api/analytics/summary/?start=YYYY-MM-DD&end=YYYY-MM-DD

    Database-side aggregation of the authenticated user's expenses: totals,
    per-category, per-month, per-month-per-category, per-payment-method and
    per-day buckets (each grouped by currency), plus the largest expense and
    most active day. Both query parameters are optional and inclusive.
    """

    permission_classes = [IsAuthenticated]

    def get(self, request):
        query = AnalyticsSummaryQuerySerializer(data=request.query_params)
        query.is_valid(raise_exception=True)

        summary = build_expense_summary(
            request.user,
            start=query.validated_data.get("start"),
            end=query.validated_data.get("end"),
        )
        return Response(summary, status=status.HTTP_200_OK)
