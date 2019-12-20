from django.conf.urls import url
from django.urls import include, re_path, path

from webgis.map import views

app_name = 'map'

urlpatterns = [
    url(r"^ows/$", views.ows, name="ows"),
    url(r"^tile/(?P<project_hash>[^/]+)/(?P<publish>\d+)/tile/(?P<layers_hash>[^/]+)/(?P<z>\d+)/(?P<x>\d+)/(?P<y>\d+)\.(?P<format>\w+)$", views.tile, name="tile"),
    url(r"^legend/(?P<project_hash>[^/]+)/(?P<publish>\d+)/legend/(?P<layer_hash>[^/]+)/(?P<zoom>\d+)\.(?P<format>\w+)$", views.legend, name="legend"),
    url(r"^filter/$", views.filterdata, name="filter"),
    url(r"^project/$", views.map_project, name="map_project")
]
