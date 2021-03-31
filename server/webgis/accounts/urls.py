from django.urls import path

from . import views

app_name = "accounts"

urlpatterns = [
    path("create/", views.create_account),
    path("check_login/", views.check_login_availability),
    path("activate/<slug:uidb64>/<slug:token>/", views.activate_account),
    path("reset_password/", views.request_password_reset),
    path("new_password/<slug:uidb64>/<slug:token>/", views.new_password),
    path("change_password/", views.change_password)
]
