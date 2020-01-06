from django.urls import re_path, path

from webgis.map import views

app_name = "map"

urlpatterns = [
    path("project/", views.map_project, name="map_project"),
    path("ows/", views.ows, name="ows"),
    path("filter/", views.filterdata, name="filter"),
    re_path(r"^tile/(?P<project_hash>[^/]+)/(?P<publish>\d+)/tile/(?P<layers_hash>[^/]+)/(?P<z>\d+)/(?P<x>\d+)/(?P<y>\d+)\.(?P<format>\w+)$", views.tile, name="tile"),
    re_path(r"^legend/(?P<project_hash>[^/]+)/(?P<publish>\d+)/legend/(?P<layer_hash>[^/]+)/(?P<zoom>\d+)\.(?P<format>\w+)$", views.legend, name="legend")
]
