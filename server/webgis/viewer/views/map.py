import os
import json
import urllib.parse
import urllib.request
import contextlib

from django.conf import settings
from django.http import HttpResponse, Http404
from django.contrib.auth.decorators import login_required
from django.views.decorators.csrf import csrf_exempt

from webgis.viewer.wfsfilter import webgisfilter
from webgis.libs.utils import set_query_parameters
from webgis.mapcache import get_tile_response, get_legendgraphic_response, \
    WmsLayer, TileNotFoundException
from webgis.viewer.views.project_utils import clean_project_name, \
    get_project_layers_info, get_last_project_version
from webgis.libs.auth.decorators import basic_authentication


def abs_project_path(project):
    return os.path.join(settings.GISQUICK_PROJECT_ROOT, project)

@basic_authentication(realm="OWS API")
def ows(request):
    params = {key.upper(): request.GET[key] for key in request.GET.keys()}
    url = "{0}?{1}".format(
        settings.GISQUICK_MAPSERVER_URL.rstrip("/"),
        request.environ['QUERY_STRING']
    )

    abs_project = abs_project_path(params.get('MAP'))
    url = set_query_parameters(url, {'MAP': abs_project})

    owsrequest = urllib.request.Request(url)
    owsrequest.add_header("User-Agent", "Gisquick")

    resp_content = b""
    with contextlib.closing(urllib.request.urlopen(owsrequest)) as resp:
        while True:
            data = resp.read()
            if not data:
                break
            resp_content += data

        if params.get('REQUEST', '') == 'GetCapabilities':
            resp_content = resp_content.replace(
                settings.GISQUICK_MAPSERVER_URL.encode(),
                request.build_absolute_uri(request.path).encode()
            )

        content_type = resp.getheader('Content-Type')
        status = resp.getcode()
        return HttpResponse(resp_content, content_type=content_type, status=status)


@login_required
def tile(request, project_hash, publish, layers_hash=None, z=None, x=None, y=None, format=None):
    params = {key.upper(): request.GET[key] for key in request.GET.keys()}
    project = params['PROJECT']+'.qgs'
    mapserver_url = set_query_parameters(
        settings.GISQUICK_MAPSERVER_URL,
        {'MAP': abs_project_path(project)}
    )
    layer_params = get_project_layers_info(project_hash, publish, project=project)
    if layer_params:
        try:
            layer = WmsLayer(
                project=project_hash,
                publish=publish,
                name=layers_hash,
                provider_layers=params['LAYERS'].encode("utf-8"),
                provider_url=mapserver_url,
                image_format=format,
                tile_size=256,
                metasize=5,
                **layer_params
            )
            return get_tile_response(layer, z=z, x=x, y=y)
        except TileNotFoundException as e:
            raise Http404
    raise Http404


@login_required
def legend(request, project_hash, publish, layer_hash=None, zoom=None, format=None):
    params = {key.upper(): request.GET[key] for key in request.GET.keys()}
    project = params['PROJECT']+'.qgs'
    mapserver_url = set_query_parameters(
        settings.GISQUICK_MAPSERVER_URL,
        {'MAP': abs_project_path(project)}
    )
    try:
        layer = WmsLayer(
            project=project_hash,
            publish=publish,
            name=layer_hash,
            provider_layers=params['LAYER'].encode('utf-8'),
            provider_url=mapserver_url,
            image_format=format,
        )
        params.pop('PROJECT')
        params.pop('LAYER')
        return get_legendgraphic_response(layer, zoom, **params)
    except:
        raise Http404


@login_required
def vector_layers(request):
    params = {k.upper(): v for k, v in request.GET.items()}
    project = params.get('PROJECT')
    if project:
        ows_project = clean_project_name(project)
        vector_data_filename = os.path.join(
            settings.GISQUICK_PROJECT_ROOT,
            '{0}.geojson'.format(ows_project)
        )
        if os.path.exists(vector_data_filename):
            return HttpResponse(
                open(vector_data_filename, 'r').read(),
                content_type='application/json'
            )
    raise Http404


@csrf_exempt
@login_required
def filterdata(request):
    """Handle filter requrest - using OGC WFS service

    The request body should look like:

    {
        'layer': 'Places',
        'maxfeatures': 1000,
        'startindex': 0,
        'bbox': [0, 1, 2, 3],
        'filters': [{
            'attribute': 'NAME',
            'value': 'Prague',
            'operator': '='
        }]
    }

    sent as HTTP POST request
    """
    if request.method == 'POST':
        project = request.GET['PROJECT']
        project = get_last_project_version(project) + '.qgs'
        url = settings.GISQUICK_MAPSERVER_URL
        params = {
            'MAP': abs_project_path(project)
        }
        mapserv = '{}?{}'.format(url, urllib.parse.urlencode(params))
        filter_request = json.loads(request.body.decode('utf-8'))

        layer_name = filter_request['layer']
        maxfeatures = startindex = bbox = filters = None

        if 'maxfeatures' in filter_request:
            maxfeatures = filter_request['maxfeatures']
        if 'startindex' in filter_request:
            startindex = filter_request['startindex']
        if 'bbox' in filter_request:
            bbox = filter_request['bbox']
        if 'filters' in filter_request:
            filters = filter_request['filters']


        result = webgisfilter(mapserv, layer_name, maxfeatures=maxfeatures,
                              startindex=startindex, bbox=bbox, filters=filters)

        return HttpResponse(json.dumps(result), content_type="application/json")
    else:
        raise Exception('No inputs specified, use POST method')
