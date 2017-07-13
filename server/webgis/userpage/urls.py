from django.conf.urls import url

from . import views

urlpatterns = [
    url(r"^user/(?P<username>[^/]*)/?$", views.user_projects, name="user_projects"),
    url(r'^project/upload/$', views.upload_file, name='upload_page'),
    url(r"^project/templates/$", views.update_table_templates),
    url(r"^project/(.+)$", views.Project.as_view())
]
