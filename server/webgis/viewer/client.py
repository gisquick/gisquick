# -*- coding: utf-8 -*-

import re
import os.path
import urllib
import urllib2
import hashlib
import time
import datetime
import contextlib

from django.conf import settings
from django.core.cache import cache
from django.http import HttpResponse, Http404
from django.contrib.auth import login
from django.utils.translation import ugettext as _

import webgis
from webgis.viewer import models
from webgis.viewer import forms
from webgis.viewer.metadata_parser import MetadataParser
from webgis.libs.utils import secure_url, set_query_parameters
from webgis.mapcache import get_tile_response, get_legendgraphic_response, WmsLayer, TileNotFoundException


OSM_LAYER = {'name': 'OSM', 'type': 'OSM', 'title': 'Open Street Map'}

OSM_RESOLUTIONS = [156543.03390625,78271.516953125,39135.7584765625,19567.87923828125,9783.939619140625,
    4891.9698095703125,2445.9849047851562,1222.9924523925781,611.4962261962891,305.74811309814453,
    152.87405654907226,76.43702827453613,38.218514137268066,19.109257068634033,9.554628534317017,4.777314267158508
]

OSM_SCALES = [591657528, 295828764, 147914382, 73957191, 36978595, 18489298, 9244649, 4622324,
    2311162, 1155581, 577791, 288895, 144448, 72224, 36112, 18056, 9028, 4514, 2257
]


class LoginRequired(Exception):
    pass


def clean_project_name(project):
    """Returns project name without QGIS file extension ('.qgs')"""
    if project.lower().endswith(".qgs"):
        return os.path.splitext(project)[0]
    return project

def get_last_project_version(project):
    full_project = os.path.join(settings.GISLAB_WEB_PROJECT_ROOT, project)
    print full_project
    project = clean_project_name(project)
    project_pattern = re.compile(re.escape(os.path.basename(project))+'_(\d{10})\.qgs')
    matched_project_versions = []
    for filename in os.listdir(os.path.dirname(full_project)):
        match = project_pattern.match(filename)
        if match:
            matched_project_versions.append((int(match.group(1)), filename))
    if matched_project_versions:
        # load last published project file
        project_filename = sorted(matched_project_versions, reverse=True)[0][1]
        project_filename = os.path.join(os.path.dirname(project), project_filename)
        return clean_project_name(project_filename)
    return project

def store_project_layers_info(project_key, publish, extent, resolutions, projection):
    prefix = "{0}:{1}:".format(project_key, publish)
    cache.set_many({
        prefix+'extent': ','.join(map(str, extent)),
        prefix+'resolutions': ','.join(map(str, resolutions)),
        prefix+'projection': projection
    })

def get_project_layers_info(project_key, publish, project=None):
    prefix = "{0}:{1}:".format(project_key, publish)
    data = cache.get_many((prefix+'extent', prefix+'resolutions', prefix+'projection'))
    if data:
        return { param.replace(prefix, ''): value for param, value in data.iteritems() }
    elif project:
        filename = "{0}_{1}.meta".format(clean_project_name(project), publish)
        metadata_filename = os.path.join(settings.GISLAB_WEB_PROJECT_ROOT, filename)
        if not os.path.exists(metadata_filename):
            # fallback to old metadata filename without publish timestamp
            metadata_filename = os.path.join(settings.GISLAB_WEB_PROJECT_ROOT, "{0}.meta".format(clean_project_name(project)))
        try:
            metadata = MetadataParser(metadata_filename)
            if int(metadata.publish_date_unix) == int(publish):
                store_project_layers_info(project_key, publish, metadata.extent, metadata.tile_resolutions, metadata.projection['code'])
                return {
                    'extent': metadata.extent,
                    'resolutions': metadata.tile_resolutions,
                    'projection': metadata.projection['code']
                }
        except Exception, e:
            pass
    return {}

def parse_layers_param(layers_string, layers_capabilities):
    tree = {
        'name': '',
        'layers': []
    }
    parts = layers_string.replace(';/', ';//').split(';/')
    for subtree_string in parts:
        location = os.path.dirname(subtree_string)
        parent = tree
        if location != '/':
            for parent_name in location.split('/')[1:]:
                #if 'layers' not in parent:
                #    parent['layers'] = []
                parent_exists = False
                for child in parent['layers']:
                    if child['name'] == parent_name:
                        parent = child
                        parent_exists = True
                        break
                if not parent_exists:
                    new_parent = {
                        'name': parent_name,
                        'layers': []
                    }
                    parent['layers'].append(new_parent)
                    parent = new_parent
        layers_string = os.path.basename(subtree_string)
        for layer_string in layers_string.split(';'):
            layer_info = layer_string.split(':')
            layer_name = layer_info[0]
            layer = layers_capabilities.get(layer_name)
            if layer is None:
                if layer_name == 'BLANK':
                    continue
                else:
                    raise LookupError(layer_name)

            if len(layer_info) > 1:
                layer['visible'] = int(layer_info[1]) == 1
            if len(layer_info) > 2:
                layer['opacity'] = float(layer_info[2])
            parent['layers'].append(layer)
    return tree

class WebgisClient(object):

    def get_ows_url(self, request):
        raise Exception

    def get_mapcache_tile_url(self, request):
        raise Exception

    def get_mapcache_legend_url(self, request):
        raise Exception

    def get_vectorlayers_url(self, request):
        raise Exception

    def render(self, request, context):
        raise Exception


    def project_request(self, request):
        self.project = None
        self.ows_project = None
        self.project_metadata = None

        form = forms.ViewerForm(request.GET)
        if not form.is_valid():
            raise Http404

        context = {}
        project = form.cleaned_data['PROJECT']

        if project:
            project = clean_project_name(project)
            ows_project_name = get_last_project_version(project)
            self.project = project
            self.ows_project = ows_project_name

            metadata_filename = os.path.join(settings.GISLAB_WEB_PROJECT_ROOT, ows_project_name + '.meta')
            try:
                metadata = MetadataParser(metadata_filename)
                self.project_metadata = metadata
            except:
                return HttpResponse("Error when loading project or project does not exist", content_type='text/plain', status=404)
            if metadata.expiration:
                expiration_date = datetime.datetime.strptime(metadata.expiration, "%d.%m.%Y").date()
                if datetime.date.today() > expiration_date:
                    return HttpResponse("Project has reached expiration date.", content_type='text/plain', status=410)

        # Authentication
        if project and type(metadata.authentication) is dict:
            # backward compatibility
            allow_anonymous = metadata.authentication.get('allow_anonymous')
            owner_authentication = False
        else:
            allow_anonymous = metadata.authentication == 'all' if project else True
            owner_authentication = metadata.authentication == 'owner' if project else False

        if not request.user.is_authenticated() and allow_anonymous:
            # login as quest and continue
            user = models.GislabUser.get_guest_user()
            if user:
                login(request, user)
            else:
                return HttpResponse("Anonymous user is not configured", content_type='text/plain', status=500)

        if (not allow_anonymous and (not request.user.is_authenticated() or request.user.is_guest)):
            raise LoginRequired()
        if owner_authentication and not request.user.is_superuser:
            project_owner = project.split('/', 1)[0]
            if project_owner != request.user.username:
                return HttpResponse("You don't have permissions for this project", content_type='text/plain', status=403)

        if project:
            ows_url = self.get_ows_url(request)
            context['units'] = {'meters': 'm', 'feet': 'ft', 'miles': 'mi', 'degrees': 'dd' }[metadata.units] or 'dd'
            use_mapcache = metadata.use_mapcache
            #use_mapcache = False
            project_tile_resolutions = metadata.tile_resolutions

            context['projection'] = metadata.projection
            context['tile_resolutions'] = project_tile_resolutions
            context['scales'] = metadata.scales

            # converts tree with layers data into simple dictionary
            def collect_layers_capabilities(layers_data, capabilities=None):
                if capabilities is None:
                    capabilities = {}
                for layer_data in layers_data:
                    sublayers = layer_data.get('layers')
                    if sublayers:
                        collect_layers_capabilities(sublayers, capabilities)
                    else:
                        capabilities[layer_data['name']] = layer_data
                return capabilities

            # BASE LAYERS
            baselayers_tree = None
            base = form.cleaned_data['BASE']
            if base:
                base_layers_capabilities = collect_layers_capabilities(metadata.base_layers)
                try:
                    baselayers_tree = parse_layers_param(base, base_layers_capabilities)['layers']
                except LookupError, e:
                    return HttpResponse("Unknown base layer: {0}".format(str(e)), content_type='text/plain', status=400)
            else:
                baselayers_tree = metadata.base_layers

            # ensure that a blank base layer is always used
            if not baselayers_tree:
                baselayers_tree = [{'name': 'BLANK', 'type': 'BLANK', 'title': 'Blank Layer', 'resolutions': project_tile_resolutions}]
            context['base_layers'] = baselayers_tree

            # OVERLAYS LAYERS
            layers = form.cleaned_data['OVERLAY']
            # override layers tree with LAYERS GET parameter if provided
            if layers:
                overlays_capabilities = collect_layers_capabilities(metadata.overlays) if metadata.overlays else {}
                try:
                    layers_tree = parse_layers_param(layers, overlays_capabilities)['layers']
                except LookupError, e:
                    return HttpResponse("Unknown overlay layer: {0}".format(str(e)), content_type='text/plain', status=400)
            else:
                layers_tree = metadata.overlays
            context['layers'] = layers_tree

            if use_mapcache:
                project_hash = hashlib.md5(project).hexdigest()
                project_layers_info = get_project_layers_info(project_hash, metadata.publish_date_unix)
                if not project_layers_info:
                    store_project_layers_info(project_hash, metadata.publish_date_unix, metadata.extent, project_tile_resolutions, metadata.projection['code'])

                context['mapcache_url'] = self.get_mapcache_tile_url(request)
                context['legend_url'] = self.get_mapcache_legend_url(request)
            else:
                context['legend_url'] = ows_url
            if metadata.vector_layers:
                context['vectorlayers_url'] = self.get_vectorlayers_url(request)

            context.update({
                'project': project,
                'ows_project': ows_project_name,
                'ows_url': ows_url,
                'wms_url': urllib.unquote(secure_url(request, ows_url)),
                'project_extent': metadata.extent,
                'zoom_extent': form.cleaned_data['EXTENT'] or metadata.zoom_extent,
                'print_composers': metadata.composer_templates if not request.user.is_guest else None,
                'root_title': metadata.title,
                'author': metadata.contact_person,
                'email': metadata.contact_mail,
                'phone': metadata.contact_phone,
                'organization': metadata.contact_organization,
                'abstract': metadata.abstract,
                'online_resource': metadata.online_resource,
                'access_constrains': metadata.access_constrains,
                'fees': metadata.fees,
                'keyword_list': metadata.keyword_list,
                'publish_user': metadata.gislab_user,
                'publish_date': metadata.publish_date,
                'publish_date_unix': int(metadata.publish_date_unix),
                'expiration_date': metadata.expiration,
                'selection_color': metadata.selection_color[:-2], #strip alpha channel,
                'topics': metadata.topics,
                'vector_layers': metadata.vector_layers is not None
            })
            if metadata.message:
                valid_until = datetime.datetime.strptime(metadata.message['valid_until'], "%d.%m.%Y").date()
                if datetime.date.today() <= valid_until:
                    context['message'] = metadata.message['text'].replace('\n', '<br />')
            # Update projects registry
            project_info = {
                'gislab_version': metadata.gislab_version,
                'gislab_user': metadata.gislab_user,
                'gislab_unique_id': metadata.gislab_unique_id,
                'publish_date': datetime.datetime.fromtimestamp(metadata.publish_date_unix),
                'last_display': datetime.datetime.now()
            }
            try:
                rows = models.Project_registry.objects.filter(project=project).update(**project_info)
                if not rows:
                    models.Project_registry(project=project, **project_info).save()
            except:
                raise
        else:
            context.update({
                'project': 'empty',
                'root_title': _('Empty Project'),
                'project_extent': [-20037508.34, -20037508.34, 20037508.34, 20037508.34],
                'tile_resolutions': OSM_RESOLUTIONS,
                'scales': OSM_SCALES,
                'projection': {
                    'code': 'EPSG:3857',
                    'is_geographic': False
                },
                'units': 'm'
            })
            context['zoom_extent'] = form.cleaned_data['EXTENT'] or context['project_extent']
            context['base_layers'] = [OSM_LAYER]

        #context['gislab_unique_id'] = GISLAB_VERSION.get('GISLAB_UNIQUE_ID', 'unknown')
        context['gislab_version'] = webgis.VERSION
        context['gislab_homepage'] = 'http://imincik.github.io/gis-lab'
        context['gislab_documentation'] = 'https://github.com/imincik/gis-lab/wiki'
        return self.render(request, context)

    def ows_request(self, request):
        url = "{0}?{1}".format(settings.GISLAB_WEB_MAPSERVER_URL.rstrip("/"), request.environ['QUERY_STRING'])
        owsrequest = urllib2.Request(url)
        owsrequest.add_header("User-Agent", "GIS.lab Web")
        with contextlib.closing(urllib2.urlopen(owsrequest)) as resp:
            resp_content = resp.read()
            content_type = resp.info().getheader('Content-Type')
            status = resp.getcode()
            return HttpResponse(resp_content, content_type=content_type, status=status)

    def mapcache_tile_request(self, request, project_hash, publish, layers_hash=None, z=None, x=None, y=None, format=None):
        params = {key.upper(): request.GET[key] for key in request.GET.iterkeys()}
        project = params['PROJECT']+'.qgs'
        layer_params = get_project_layers_info(project_hash, publish, project=project)
        if layer_params:
            try:
                layer = WmsLayer(
                    project=project_hash,
                    publish=publish,
                    name=layers_hash,
                    provider_layers=params['LAYERS'].encode("utf-8"),
                    provider_url=set_query_parameters(settings.GISLAB_WEB_MAPSERVER_URL, {'MAP': project}),
                    image_format=format,
                    tile_size=256,
                    metasize=5,
                    **layer_params
                )
                return get_tile_response(layer, z=z, x=x, y=y)
            except TileNotFoundException, e:
                raise Http404
        raise Http404


    def mapcache_legend_request(self, request, project_hash, publish, layer_hash=None, zoom=None, format=None):
        params = {key.upper(): request.GET[key] for key in request.GET.iterkeys()}
        project = params['PROJECT']+'.qgs'
        try:
            layer = WmsLayer(
                project=project_hash,
                publish=publish,
                name=layer_hash,
                provider_layers=params['LAYER'].encode('utf-8'),
                provider_url=set_query_parameters(settings.GISLAB_WEB_MAPSERVER_URL, {'MAP': project}),
                image_format=format,
            )
            params.pop('PROJECT')
            params.pop('LAYER')
            return get_legendgraphic_response(layer, zoom, **params)
        except:
            raise Http404

    def vector_layers_request(self, request):
        params = {k.upper(): v for k, v in request.GET.iteritems()}
        project = params.get('PROJECT')
        if project:
            ows_project = clean_project_name(project)
            vector_data_filename = os.path.join(settings.GISLAB_WEB_PROJECT_ROOT, '{0}.geojson'.format(ows_project))
            if os.path.exists(vector_data_filename):
                return HttpResponse(open(vector_data_filename, 'r').read(), content_type='application/json')
        raise Http404

    def get_user_projects(self, request, username):
        projects = []
        projects_root = os.path.join(settings.GISLAB_WEB_PROJECT_ROOT, username)
        project_prefix_length = len(os.path.join(settings.GISLAB_WEB_PROJECT_ROOT, ''))
        for root, dirs, files in os.walk(projects_root):
            if files:
                # analyze project filenames and group different publications of the same project into one record
                projects_files = {}
                project_pattern = re.compile('(.+)_(\d{10})\.qgs')
                for filename in files:
                    match = project_pattern.match(filename)
                    if match:
                        project_name = match.group(1)
                        project_timestamp = int(match.group(2))
                    elif filename.endswith('.qgs'):
                        project_name = filename[:-4]
                        project_timestamp = 0
                    else:
                        continue
                    metadata_filename = filename[:-4]+'.meta'
                    if metadata_filename in files:
                        if project_name not in projects_files:
                            projects_files[project_name] = [(project_timestamp, filename)]
                        else:
                            projects_files[project_name].append((project_timestamp, filename))

                for project_name, info in projects_files.iteritems():
                    # select last project version by timestamp
                    ows_project = sorted(info, reverse=True)[0][1]

                    project_filename = os.path.join(root, project_name)
                    ows_project_filename = os.path.join(root, ows_project)
                    self.project = clean_project_name(project_filename[project_prefix_length:])
                    self.ows_project = clean_project_name(ows_project_filename[project_prefix_length:])
                    metadata_filename = clean_project_name(ows_project_filename) + '.meta'
                    try:
                        metadata = MetadataParser(metadata_filename)
                        self.metadata = metadata
                        url = set_query_parameters(secure_url(request, '/'), {'PROJECT': self.project})
                        ows_url = secure_url(request, self.get_ows_url(request))
                        authentication = metadata.authentication
                        # backward compatibility with older version
                        if type(authentication) is dict:
                            if authentication.get('allow_anonymous') and not authentication.get('require_superuser'):
                                authentication = 'all'
                            else:
                                authentication = 'authenticated'
                        projects.append({
                            'title': metadata.title,
                            'url': url,
                            'project': self.project,
                            'ows_url': ows_url,
                            'cache': metadata.use_mapcache,
                            'authentication': authentication,
                            'publication_time_unix': int(metadata.publish_date_unix),
                            'expiration_time_unix': int(time.mktime(time.strptime(metadata.expiration, "%d.%m.%Y"))) if metadata.expiration else None
                        })
                    except IOError:
                        # metadata file does not exists or not valid
                        pass
        return projects
