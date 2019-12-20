from django.conf.urls import url

from . import views

urlpatterns = [
    url(r"^app/$", views.app, name="app"),
    url(r"^projects/$", views.get_projects, name="get_projects"),
    url(r"^projects/(?P<username>[^/]+)/$", views.user_projects, name="user_projects")
]
