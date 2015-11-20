from django.conf.urls import url

from  webgis.mobile import views


urlpatterns = [
    url(r"^login/$", views.client_login, name="client_login"),
    url(r"^logout/$", views.client_logout, name="client_logout")
]
