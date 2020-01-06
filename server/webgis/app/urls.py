from django.urls import path, re_path

from . import views

app_name = "accounts"

urlpatterns = [
    path("app/", views.app),
    re_path(r"^projects/$", views.get_projects),
    re_path(r"^projects/(?P<username>[^/]+)/$", views.user_projects)
]
