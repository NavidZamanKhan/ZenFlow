from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Budget
from .serializers import BudgetSerializer


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
