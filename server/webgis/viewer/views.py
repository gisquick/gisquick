# -*- coding: utf-8 -*-

import json
import hashlib
import urllib

from django.conf import settings
from django.shortcuts import render
from django.http import HttpResponse, Http404, HttpResponseRedirect
from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.decorators import login_required
from django.core.urlresolvers import reverse
from django.utils.translation import ugettext as _

from webgis.viewer import forms
from webgis.viewer import models
import webgis.viewer.client as gislab_client
from webgis.viewer.client import WebgisClient, LoginRequired
from webgis.libs.auth.decorators import basic_authentication
from webgis.libs.utils import secure_url, set_query_parameters

from django.views.decorators.csrf import csrf_exempt
from wfsfilter import webgisfilter

class WebClient(WebgisClient):

    def get_ows_url(self, request):
        return set_query_parameters(reverse('viewer:owsrequest'), {'MAP': self.ows_project+'.qgs'})

    def get_mapcache_tile_url(self, request):
        project_hash = hashlib.md5(self.project).hexdigest()
        mapcache_url = reverse('viewer:tile', kwargs={'project_hash': project_hash, 'publish': self.project_metadata.publish_date_unix, 'layers_hash': '__layers__', 'x': 0, 'y': 0, 'z': 0, 'format': 'png'})
        return mapcache_url.split('/__layers__/')[0]+'/'

    def get_mapcache_legend_url(self, request):
        project_hash = hashlib.md5(self.project).hexdigest()
        legend_url = reverse('viewer:legend', kwargs={'project_hash': project_hash, 'publish': self.project_metadata.publish_date_unix, 'layer_hash': '__layer__', 'zoom': 0, 'format': 'png'})
        return legend_url.split('/__layer__/')[0]+'/'

    def get_vectorlayers_url(self, request):
        return set_query_parameters(reverse('viewer:vectorlayers'), {'PROJECT': self.ows_project})

    def render(self, request, project_data):
        return render(
            request,
            "viewer/index.html",
            {
                'user': request.user,
                'project': json.dumps(project_data)
            },
            content_type="text/html"
        )

class ProjectJsonClient(WebClient):

    def render(self, request, project_data):
        return HttpResponse(json.dumps(project_data), content_type="application/json")

webclient = WebClient()

def web_client(request):
    try:
        return webclient.project_request(request)
    except LoginRequired, e:
        # redirect to login page
        login_url = secure_url(request, reverse('login'))
        return HttpResponseRedirect(set_query_parameters(login_url, {'next': secure_url(request)}))

def project_json(request):
    try:
        return ProjectJsonClient().project_request(request)
    except LoginRequired, e:
        return HttpResponse('Authentication required', status=401)


@basic_authentication(realm="OWS API")
def ows_request(request):
    return webclient.ows_request(request)

@login_required
def tile(request, project_hash, publish, layers_hash=None, z=None, x=None, y=None, format=None):
    return webclient.mapcache_tile_request(request, project_hash, publish, layers_hash=layers_hash, z=z, x=x, y=y, format=format)

@login_required
def legend(request, project_hash, publish, layer_hash=None, zoom=None, format=None):
    return webclient.mapcache_legend_request(request, project_hash, publish, layer_hash=layer_hash, zoom=zoom, format=format)

@login_required
def vector_layers(request):
    return webclient.vector_layers_request(request)


def user_projects(request, username):
    if not request.user.is_authenticated() or request.user.is_guest:
        # redirect to login page
        login_url = secure_url(request, reverse('login'))
        return HttpResponseRedirect(set_query_parameters(login_url, {'next': secure_url(request)}))
    if not username:
        redirect_url = secure_url(request, reverse('viewer:user_projects', kwargs={'username': request.user.username}))
        return HttpResponseRedirect(redirect_url)
    if username != request.user.username:
        if not request.user.is_superuser:
            return HttpResponse("Access Denied", content_type='text/plain', status=403)
        else:
            try:
                request.user = models.GislabUser.objects.get(username=username)
            except models.GislabUser.DoesNotExist:
                return HttpResponse("User does not exist.", content_type='text/plain', status=403)

    projects = [{
        'title': _('Empty Project'),
        'url': request.build_absolute_uri('/'),
    }]
    projects.extend(webclient.get_user_projects(request, username))
    context = {
        'username': username,
        'projects': projects,
        'debug': settings.DEBUG
    }
    return render(request, "viewer/user_projects.html", context, content_type="text/html")


def gislab_version_json(request):
    data = gislab_client.GISLAB_VERSION
    return HttpResponse(json.dumps(data), content_type="application/json")

@login_required
def user_json(request):
    user = request.user
    data = {
        'username': user.username,
        'first_name': user.first_name,
        'last_name': user.last_name,
        'email': user.email,
        'is_superuser': user.is_superuser
    }
    return HttpResponse(json.dumps(data), content_type="application/json")

@login_required
def projects_json(request):
    projects = webclient.get_user_projects(request, request.user.username)
    return HttpResponse(json.dumps(projects), content_type="application/json")


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
        url = settings.GISLAB_WEB_MAPSERVER_URL
        params = {
            'MAP': project + '.qgs'
        }
        mapserv = '{}?{}'.format(url, urllib.urlencode(params))
        filter_request = json.loads(request.body)

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
