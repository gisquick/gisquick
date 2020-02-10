from django.urls import path, re_path

from . import views

app_name = "app"

urlpatterns = [
    path("app/", views.app),
    path("users/", views.get_users),
    path("projects/", views.get_projects),
    re_path(r"^projects/(?P<username>[^/]+)/$", views.user_projects)
]
