from django.urls import path

from .views import BudgetDetailView

urlpatterns = [
    path('', BudgetDetailView.as_view(), name='budget-detail'),
]
