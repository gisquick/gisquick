from django.conf.urls import url

from webgis.viewer.views import web_client, map, api


urlpatterns = [
    url(r"^$", web_client.map, name="map"),
    url(r"^user/(?P<username>[^/]*)/?$", web_client.user_projects, name="user_projects"),
    url(r"^login/$", web_client.client_login, name="login"),
    url(r"^logout/$", web_client.client_logout, name="logout"),

    url(r"^ows/$", map.ows, name="ows"),
    url(r"^tile/(?P<project_hash>[^/]+)/(?P<publish>\d+)/tile/(?P<layers_hash>[^/]+)/(?P<z>\d+)/(?P<x>\d+)/(?P<y>\d+)\.(?P<format>\w+)$", map.tile, name="tile"),
    url(r"^legend/(?P<project_hash>[^/]+)/(?P<publish>\d+)/legend/(?P<layer_hash>[^/]+)/(?P<zoom>\d+)\.(?P<format>\w+)$", map.legend, name="legend"),
    url(r"^vector/$", map.vector_layers, name="vectorlayers"),
    url(r"^filter/$", map.filterdata, name="filter"),

    url(r"^project.json$", api.project_json, name="project_json"),
    url(r"^projects.json$", api.projects_json, name="projects_json"),
    url(r"^user.json$", api.user_json, name="user_json"),
    url(r"^project/templates/$", api.update_table_templates),
    url(r"^project/(.+)$", api.Project.as_view()),
]
