import os
import json
import urllib.parse
import urllib.request
import contextlib
import hashlib

from django.conf import settings
from django.http import HttpResponse, Http404
from django.contrib.auth.decorators import login_required
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.vary import vary_on_headers
from django.core.exceptions import PermissionDenied

from webgis.viewer.wfsfilter import webgisfilter
from webgis.libs.utils import set_query_parameters
from webgis.mapcache import get_tile_response, get_legendgraphic_response, \
    WmsLayer, TileNotFoundException
from webgis.viewer.views.project_utils import clean_project_name, \
    get_project_info, get_last_project_version
from webgis.libs.auth import basic


def abs_project_path(project):
    return os.path.join(settings.GISQUICK_PROJECT_ROOT, project)

def check_project_access(request, project, project_auth):
    if project_auth == "all":
        return True
    elif project_auth == "authenticated":
        return request.user.is_authenticated()
    elif project_auth == "owner":
        project_owner = project.split('/', 1)[0]
        return request.user.is_authenticated() and (project_owner == request.user.username or request.user.is_superuser)
    return False


@csrf_exempt
@vary_on_headers('Authorization')
def ows(request):
    params = {key.upper(): request.GET[key] for key in request.GET.keys()}

    ows_project = clean_project_name(params.get('MAP'))
    project, timestamp, *_ = ows_project.rsplit("_", 1) + [""]
    project_hash = hashlib.md5(project.encode('utf-8')).hexdigest()
    pi = get_project_info(project_hash, timestamp, project=ows_project)
    if not request.user.is_authenticated():
        basic.is_authenticated(request)
    if not check_project_access(request, project, pi['authentication']):
        if not request.user.is_authenticated():
            response = HttpResponse('Authentication required', status=401)
            response['WWW-Authenticate'] = 'Basic realm=OWS API'
            return response
        raise PermissionDenied

    url = "{0}?{1}".format(
        settings.GISQUICK_MAPSERVER_URL.rstrip("/"),
        request.environ['QUERY_STRING']
    )
    abs_project = abs_project_path(params.get('MAP'))
    url = set_query_parameters(url, {'MAP': abs_project})

    if request.method == 'POST':
        owsrequest = urllib.request.Request(url, request.body)
    else:
        owsrequest = urllib.request.Request(url)
    owsrequest.add_header("User-Agent", "Gisquick")

    resp_content = b""
    try:
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
    except urllib.error.HTTPError as e:
        # reason = e.read().decode("utf8")
        return HttpResponse(e.read(), content_type=e.headers.get_content_type(), status=e.code)

def tile(request, project_hash, publish, layers_hash=None, z=None, x=None, y=None, format=None):
    params = {key.upper(): request.GET[key] for key in request.GET.keys()}
    project = params['PROJECT']+'.qgs'
    mapserver_url = set_query_parameters(
        settings.GISQUICK_MAPSERVER_URL,
        {'MAP': abs_project_path(project)}
    )
    project_info = get_project_info(project_hash, publish, project=project)
    if not project_info:
        raise Http404
    if not check_project_access(request, params['PROJECT'], project_info['authentication']):
        raise PermissionDenied
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
            extent=project_info['extent'],
            resolutions=project_info['tile_resolutions'],
            projection=project_info['projection']['code']
        )
        return get_tile_response(layer, z=z, x=x, y=y)
    except TileNotFoundException as e:
        raise Http404


def legend(request, project_hash, publish, layer_hash=None, zoom=None, format=None):
    params = {key.upper(): request.GET[key] for key in request.GET.keys()}
    project = params['PROJECT']+'.qgs'
    mapserver_url = set_query_parameters(
        settings.GISQUICK_MAPSERVER_URL,
        {'MAP': abs_project_path(project)}
    )
    project_info = get_project_info(project_hash, publish, project=project)
    if not project_info:
        raise Http404
    if not check_project_access(request, params['PROJECT'], project_info['authentication']):
        raise PermissionDenied

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
