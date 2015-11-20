from django.conf.urls import url

from webgis.viewer import views


urlpatterns = [
    url(r"^$", views.web_client, name="web_client"),
    url(r"^user/(?P<username>[^/]*)/?$", views.user_projects, name="user_projects"),
    url(r"^owsrequest/$", views.ows_request, name="owsrequest"),
    url(r"^tile/(?P<project_hash>[^/]+)/(?P<publish>\d+)/tile/(?P<layers_hash>[^/]+)/(?P<z>\d+)/(?P<x>\d+)/(?P<y>\d+)\.(?P<format>\w+)$", views.tile, name="tile"),
    url(r"^legend/(?P<project_hash>[^/]+)/(?P<publish>\d+)/legend/(?P<layer_hash>[^/]+)/(?P<zoom>\d+)\.(?P<format>\w+)$", views.legend, name="legend"),
    url(r"^vector/$", views.vector_layers, name="vectorlayers"),

    url(r"^project.json$", views.project_json, name="project_json"),
    url(r"^projects.json$", views.projects_json, name="projects_json"),
    url(r"^user.json$", views.user_json, name="user_json"),
     url(r"^gislab_version.json$", views.gislab_version_json, name="gislab_version_json"),

    url(r"^filter/$", views.filter, name="filter")
]
