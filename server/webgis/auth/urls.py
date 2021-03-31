from django.urls import path

from . import views

app_name = "auth"

urlpatterns = [
    path("login/", views.client_login),
    path("logout/", views.client_logout),
    path("user/", views.user_info),
    path("is_authenticated/", views.is_authenticated),
    path("is_admin/", views.is_admin)
]
