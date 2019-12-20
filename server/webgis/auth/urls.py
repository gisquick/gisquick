from django.conf.urls import url

from . import views

urlpatterns = [
    url(r"^login/$", views.client_login, name="login"),
    url(r"^logout/$", views.client_logout, name="logout"),
    url(r"^user/$", views.user_info, name="user")
]
