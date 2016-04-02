import os
import re
import json
import urllib
import hashlib
import datetime

from django.conf import settings
from django.core.cache import cache
from django.shortcuts import render
from django.http import HttpResponse, Http404
from django.contrib.auth import login
from django.contrib.auth.decorators import login_required
from django.utils.translation import ugettext as _

import webgis
from webgis.viewer import forms
from webgis.viewer import models
from webgis.viewer.metadata_parser import MetadataParser
from webgis.libs.utils import secure_url, set_query_parameters
from webgis.viewer.views.reverse import project_ows_url, project_tile_url, \
    project_legend_url, project_vectorlayers_url


OSM_LAYER = {'name': 'OSM', 'type': 'OSM', 'title': 'Open Street Map'}

OSM_RESOLUTIONS = [
    156543.03390625, 78271.516953125, 39135.7584765625, 19567.87923828125,
    9783.939619140625, 4891.9698095703125, 2445.9849047851562, 1222.9924523925781,
    611.4962261962891, 305.74811309814453, 152.87405654907226, 76.43702827453613,
    38.218514137268066, 19.109257068634033, 9.554628534317017, 4.777314267158508
]

OSM_SCALES = [
    591657528, 295828764, 147914382, 73957191, 36978595, 18489298, 9244649,
    4622324,2311162, 1155581, 577791, 288895, 144448, 72224, 36112, 18056,
    9028, 4514, 2257
]

class InvalidProjectException(Exception):
    pass

def clean_project_name(project):
    """Returns project name without QGIS file extension ('.qgs')"""
    if project.lower().endswith(".qgs"):
        return os.path.splitext(project)[0]
    return project

def get_last_project_version(project):
    full_project = os.path.join(settings.GISLAB_WEB_PROJECT_ROOT, project)
    project_dir = os.path.dirname(full_project)
    if not os.path.exists(project_dir):
        return None

    project = clean_project_name(project)
    project_pattern = re.compile(re.escape(os.path.basename(project))+'_(\d{10})\.qgs')
    matched_project_versions = []
    for filename in os.listdir(project_dir):
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
            metadata_filename = os.path.join(
                settings.GISLAB_WEB_PROJECT_ROOT,
                "{0}.meta".format(clean_project_name(project))
            )
        try:
            metadata = MetadataParser(metadata_filename)
            if int(metadata.publish_date_unix) == int(publish):
                store_project_layers_info(
                    project_key, publish,
                    metadata.extent,
                    metadata.tile_resolutions,
                    metadata.projection['code']
                )
                return {
                    'extent': metadata.extent,
                    'resolutions': metadata.tile_resolutions,
                    'projection': metadata.projection['code']
                }
        except Exception, e:
            pass
    return {}


def _project_basic_data(metadata):
    return {
        'root_title': metadata.title,
        'authentication': metadata.authentication,
        'expiration_date': metadata.expiration,
        'author': metadata.contact_person,
        'publish_user': metadata.gislab_user,
        'publish_date': metadata.publish_date,
        'publish_date_unix': int(metadata.publish_date_unix)
    }

def get_project(request):
    ows_project = None

    form = forms.ViewerForm(request.GET)
    if not form.is_valid():
        raise Http404

    context = {}
    project = form.cleaned_data['PROJECT']

    if project:
        project = clean_project_name(project)
        ows_project_name = get_last_project_version(project)
        if not ows_project_name:
            raise Http404

        ows_project = ows_project_name

        metadata_filename = os.path.join(
            settings.GISLAB_WEB_PROJECT_ROOT,
            ows_project_name + '.meta'
        )
        try:
            metadata = MetadataParser(metadata_filename)
        except:
            raise InvalidProjectException

        if metadata.expiration:
            expiration_date = datetime.datetime.strptime(metadata.expiration, "%d.%m.%Y").date()
            if datetime.date.today() > expiration_date:
                project_data = _project_basic_data(metadata)
                project_data['status'] = 410
                return project_data

    # Authentication
    allow_anonymous = metadata.authentication == 'all' if project else True
    owner_authentication = metadata.authentication == 'owner' if project else False

    if not allow_anonymous and (not request.user.is_authenticated() or request.user.is_guest):
        project_data = _project_basic_data(metadata)
        project_data['status'] = 401
        return project_data

    if owner_authentication and not request.user.is_superuser:
        project_owner = project.split('/', 1)[0]
        if project_owner != request.user.username:
            project_data = _project_basic_data(metadata)
            project_data['status'] = 403
            return project_data

    if project:
        ows_url = project_ows_url(ows_project)
        context['units'] = {
            'meters': 'm',
            'feet': 'ft',
            'miles': 'mi',
            'degrees': 'dd'
        }[metadata.units] or 'dd'
        use_mapcache = metadata.use_mapcache
        #use_mapcache = False
        project_tile_resolutions = metadata.tile_resolutions

        context['projection'] = metadata.projection
        context['tile_resolutions'] = project_tile_resolutions
        context['scales'] = metadata.scales

        # use 'serverName' attribute as layer's name
        # and 'name' attribute as layer's title
        def convert_layers_names(layers):
            for layer in layers:
                if 'layers' in layer:
                    convert_layers_names(layer['layers'])
                elif 'serverName' in layer:
                    layer['title'] = layer['name']
                    layer['name'] = layer['serverName']

        convert_layers_names(metadata.base_layers)
        convert_layers_names(metadata.overlays)

        # BASE LAYERS
        baselayers_tree = metadata.base_layers
        base = form.cleaned_data['BASE']
        if base:
            # TODO:
            #update_layers(baselayers_tree, base)
            pass

        # ensure that a blank base layer is always used
        if not baselayers_tree:
            baselayers_tree = [{
                'name': 'BLANK',
                'type': 'BLANK',
                'title': 'Blank Layer',
                'resolutions': project_tile_resolutions
            }]
        context['base_layers'] = baselayers_tree

        # OVERLAYS LAYERS
        layers_tree = metadata.overlays
        layers = form.cleaned_data['OVERLAY']
        # override layers tree with LAYERS GET parameter if provided
        if layers:
            # TODO:
            #update_layers(layers_tree, layers)
            pass
        context['layers'] = layers_tree

        if use_mapcache:
            project_hash = hashlib.md5(project).hexdigest()
            project_layers_info = get_project_layers_info(project_hash, metadata.publish_date_unix)
            if not project_layers_info:
                store_project_layers_info(
                    project_hash,
                    metadata.publish_date_unix,
                    metadata.extent,
                    project_tile_resolutions,
                    metadata.projection['code']
                )

            context['mapcache_url'] = project_tile_url(project, metadata.publish_date_unix)
            context['legend_url'] = project_legend_url(project, metadata.publish_date_unix)
        else:
            context['legend_url'] = ows_url
        if metadata.vector_layers:
            context['vectorlayers_url'] = project_vectorlayers_url(ows_project)

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
            'position_precision': metadata.position_precision,
            'topics': metadata.topics,
            'authentication': metadata.authentication
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
            'units': 'm',
            'authentication': 'all'
        })
        context['zoom_extent'] = form.cleaned_data['EXTENT'] or context['project_extent']
        context['base_layers'] = [OSM_LAYER]

    #context['gislab_unique_id'] = GISLAB_VERSION.get('GISLAB_UNIQUE_ID', 'unknown')
    context['gislab_version'] = webgis.VERSION
    context['gislab_homepage'] = 'http://imincik.github.io/gis-lab'
    context['gislab_documentation'] = 'https://github.com/imincik/gis-lab/wiki'
    context['status'] = 200
    return context


def get_user_projects(request, username):
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
                last_project_filename = sorted(info, reverse=True)[0][1]

                project_filename = os.path.join(root, project_name)
                ows_project_filename = os.path.join(root, last_project_filename)
                project = clean_project_name(project_filename[project_prefix_length:])
                ows_project = clean_project_name(ows_project_filename[project_prefix_length:])
                metadata_filename = clean_project_name(ows_project_filename) + '.meta'
                try:
                    metadata = MetadataParser(metadata_filename)
                    url = set_query_parameters(secure_url(request, '/'), {'PROJECT': project})
                    ows_url = secure_url(request, project_ows_url(ows_project))
                    authentication = metadata.authentication
                    # backward compatibility with older version
                    if type(authentication) is dict:
                        if authentication.get('allow_anonymous') and \
                            not authentication.get('require_superuser'):
                            authentication = 'all'
                        else:
                            authentication = 'authenticated'
                    projects.append({
                        'title': metadata.title,
                        'url': url,
                        'project': project,
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
