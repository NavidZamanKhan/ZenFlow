from django.urls import path

from .views import BudgetDetailView, RecordAlertsView

urlpatterns = [
    path('', BudgetDetailView.as_view(), name='budget-detail'),
    path('record-alerts/', RecordAlertsView.as_view(), name='budget-record-alerts'),
]
