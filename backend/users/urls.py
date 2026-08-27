from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView

from . import views

urlpatterns = [
    path("register/", views.RegisterView.as_view(), name="auth-register"),
    path("verify-email/", views.VerifyEmailView.as_view(), name="auth-verify-email"),
    path("resend-otp/", views.ResendOTPView.as_view(), name="auth-resend-otp"),
    path("login/", views.LoginView.as_view(), name="auth-login"),
    path("refresh/", TokenRefreshView.as_view(), name="auth-refresh"),
    path("google/", views.GoogleAuthView.as_view(), name="auth-google"),
    path("logout/", views.LogoutView.as_view(), name="auth-logout"),
    path("me/", views.MeView.as_view(), name="auth-me"),
    path("password/set/", views.SetPasswordView.as_view(), name="auth-password-set"),
    path("password/otp/", views.PasswordResetOTPView.as_view(), name="auth-password-otp"),
    path("password/reset/", views.ResetPasswordWithOTPView.as_view(), name="auth-password-reset"),
    path("delete-account/otp/", views.DeleteAccountOTPView.as_view(), name="auth-delete-account-otp"),
    path("delete-account/", views.DeleteAccountView.as_view(), name="auth-delete-account"),
]