import os
import re
import json
import time
import urllib.parse
import hashlib
import datetime

from django.conf import settings
from django.core.cache import cache
from django.http import HttpResponse, Http404
from django.utils.translation import ugettext as _
from django.utils import timezone

import webgis
from webgis.map import forms
from webgis.app.models import Project_registry
from webgis.map.metadata_parser import MetadataParser
from webgis.map.reverse import project_ows_url, project_tile_url, project_legend_url
from webgis.libs.utils import set_query_parameters


BLANK_LAYER = {
    'name': 'Blank Layer',
    'type': 'blank',
    'metadata': {
        'abstract': 'Blank base map layer.',
        'keyword_list': 'blank'
    }
}

class InvalidProjectException(Exception):
    pass

def clean_project_name(project):
    """Returns project name without QGIS file extension ('.qgs')"""
    if project.lower().endswith(".qgs"):
        return os.path.splitext(project)[0]
    return project

def get_last_project_version(project):
    full_project = os.path.join(settings.GISQUICK_PROJECT_ROOT, project)
    project_dir = os.path.dirname(full_project)
    if not os.path.exists(project_dir):
        return None

    project = clean_project_name(project)
    project_pattern = re.compile(re.escape(os.path.basename(project))+'_(\d{10})\.qgs$')
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

def store_project_info(project_key, publish, metadata):
    key = "{0}:{1}:".format(project_key, publish)
    subset_attrs = ["extent", "tile_resolutions", "projection", "authentication", "access_control"]
    info = {k: metadata.get(k, None) for k in subset_attrs}
    cache.set(key, json.dumps(info), timeout=120)
    return info

def get_project_info(project_key, publish, project=None):
    prefix = "{0}:{1}:".format(project_key, publish)
    data = cache.get(prefix)
    if data:
        return json.loads(data)
    elif project:
        filename = "{0}_{1}.meta".format(clean_project_name(project), publish)
        metadata_filename = os.path.join(settings.GISQUICK_PROJECT_ROOT, filename)
        if not os.path.exists(metadata_filename):
            # fallback to old metadata filename without publish timestamp
            metadata_filename = os.path.join(
                settings.GISQUICK_PROJECT_ROOT,
                "{0}.meta".format(clean_project_name(project))
            )
        try:
            metadata = MetadataParser(metadata_filename)
            if not publish or int(metadata.publish_date_unix) == int(publish):
                data = store_project_info(project_key, publish, metadata)
                return data
        except Exception as e:
            print(str(e))
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


def _layers_names(layers, result=None):
    """ Fetch layers name/title info."""
    if result is None:
        result = {}

    for layer in layers:
        if 'layers' in layer:
            _layers_names(layer['layers'], result)
        else:
            title = layer.get('metadata', {}).get('title') or layer['name']
            name = layer.get('serverName') or layer['name']
            result[layer['name']] = {
                'title': title,
                'name': name
            }
    return result

def _published_layers(layers):
    return [l for l in layers if 'publish' not in l or l['publish'] == True]

def _convert_layers_names(layers, info):
    leafs = []
    groups = []
    for layer in _published_layers(layers):
        if 'layers' in layer:
            group_layers = _published_layers(_convert_layers_names(layer['layers'], info))
            layer['layers'] = group_layers
            groups.append(layer)
        else:
            layername = layer['name']
            layer['title'] = info[layername]['title']
            layer['name'] = info[layername]['name']
            layer.pop('serverName', None)
            leafs.append(layer)
    return leafs + groups

def _filter_layers(layers, test):
    filtered = []
    for item in layers:
        if 'layers' in item:
            children = _filter_layers(item['layers'], test)
            if children:
                filtered.append({**item, "layers": children})
        elif test(item):
            filtered.append(item)
    return filtered

def _iterate_layers(layers):
    for item in layers:
        if 'layers' in item:
            yield from _iterate_layers(item['layers'])
        else:
            yield item

def _convert_topics(topics, info):
    for topic in topics:
        topic['visible_overlays'] = [info[name]['name'] for name in topic['visible_overlays']]

def _convert_layers_metadata(layers):
    """ Returns transformed layers tree.

      - reorder layers - layers first, then groups
      - set 'serverName' attribute as layer's name and 'name' attribute as layer's title

    """
    leafs = []
    groups = []
    for layer in layers:
        if 'layers' in layer:
            groups.append(layer)
            layer['layers'] = _convert_layers_metadata(layer['layers'])
        else:
            metaLayerName = layer['name']
            if layer.get('serverName'):
                layer['title'] = layer['name']
                layer['name'] = layer['serverName']
            layer_title = layer.get('metadata', {}).get('title')
            if layer_title:
                layer['title'] = layer_title
            leafs.append(layer)
    return leafs + groups


def check_role_access(user, role):
    auth = role['auth']
    if auth == 'all':
        return True
    if auth == 'authenticated':
        return user.is_authenticated
    if auth == 'anonymous':
        return not user.is_authenticated
    elif auth == 'users':
        return user.username in role['users']


def get_project(request):
    ows_project = None

    form = forms.ViewerForm(request.GET)
    if not form.is_valid():
        raise Http404

    context = {}
    project = form.cleaned_data['PROJECT']
    if not project:
        raise Http404

    project = clean_project_name(project)
    ows_project_name = get_last_project_version(project)
    if not ows_project_name:
        raise Http404

    ows_project = ows_project_name

    metadata_filename = os.path.join(
        settings.GISQUICK_PROJECT_ROOT,
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

    if not allow_anonymous and not request.user.is_authenticated:
        project_data = _project_basic_data(metadata)
        project_data['status'] = 401
        return project_data

    if owner_authentication and not request.user.is_superuser:
        project_owner = project.split('/', 1)[0]
        if project_owner != request.user.username:
            project_data = _project_basic_data(metadata)
            project_data['status'] = 403
            return project_data

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

    # BASE LAYERS
    baselayers_tree = _published_layers(_convert_layers_metadata(metadata.base_layers))
    base = form.cleaned_data['BASE']
    if base:
        # TODO:
        #update_layers(baselayers_tree, base)
        pass

    # ensure that a blank base layer is always used
    if not baselayers_tree:
        blank_layer = dict(BLANK_LAYER)
        blank_layer['resolutions'] = project_tile_resolutions
        baselayers_tree = [blank_layer]
    context['base_layers'] = baselayers_tree

    # OVERLAYS LAYERS
    info = _layers_names(metadata.overlays)
    _convert_topics(metadata.topics, info)
    layers_tree = _convert_layers_names(metadata.overlays, info)
    layers = form.cleaned_data['OVERLAY']
    # override layers tree with LAYERS GET parameter if provided
    if layers:
        # TODO:
        #update_layers(layers_tree, layers)
        pass

    if metadata.access_control and metadata.access_control['enabled']:
        # compute layers permissions for current user
        layers_permissions = {}
        for role in metadata.access_control['roles']:
            if check_role_access(request.user, role):
                for layername, role_permissions in role['permissions']['layers'].items():
                    if layername not in layers_permissions:
                        layers_permissions[layername] = {}
                    for k, v in role_permissions.items():
                        layers_permissions[layername][k] = layers_permissions[layername].get(k) or v

        def check_layername_access(layername):
            perms = layers_permissions.get(layername)
            return perms and perms.get('view')

        layers_tree = _filter_layers(layers_tree, lambda l: check_layername_access(l['name']))
        # insert layer permissions information into layer data
        for layer in _iterate_layers(layers_tree):
            layer['permissions'] = layers_permissions.get(layer['name'])

        # remove not allowed layers from topics and remove 'empty' topics
        for topic in metadata.topics:
            topic['visible_overlays'] = list(filter(check_layername_access, topic['visible_overlays']))
        metadata.topics = list(filter(lambda t: t['visible_overlays'], metadata.topics))

    context['layers'] = layers_tree

    if use_mapcache:
        context['mapcache_url'] = project_tile_url(project, metadata.publish_date_unix)
        context['legend_url'] = project_legend_url(project, metadata.publish_date_unix)
    else:
        context['legend_url'] = ows_url

    context.update({
        'project': project,
        'ows_project': ows_project_name,
        'ows_url': ows_url,
        'wms_url': urllib.parse.unquote(ows_url),
        'project_extent': metadata.extent,
        'zoom_extent': form.cleaned_data['EXTENT'] or metadata.zoom_extent,
        'print_composers': metadata.composer_templates if request.user.is_authenticated else None,
        'info_panel': metadata.info_panel,
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
        'authentication': metadata.authentication,
        'plugin_version': metadata.plugin_version,
        'projections': metadata.projections
    })
    project_dir = os.path.dirname(project)
    scripts_infofile = os.path.join(settings.GISQUICK_PROJECT_ROOT, project_dir, 'static', 'scripts.json')
    if os.path.exists(scripts_infofile):
        with open(scripts_infofile) as json_file:
            context['scripts'] = json.load(json_file)

    if metadata.message:
        valid_until = datetime.datetime.strptime(metadata.message['valid_until'], "%d.%m.%Y").date()
        if datetime.date.today() <= valid_until:
            context['message'] = metadata.message['text'].replace('\n', '<br />')

    project_hash = hashlib.md5(project.encode('utf-8')).hexdigest()
    project_info = get_project_info(project_hash, metadata.publish_date_unix)
    # if not project_info:
    store_project_info(project_hash, metadata.publish_date_unix, metadata)

    # Update projects registry
    registry_info = {
        'plugin_version': metadata.plugin_version or '',
        'gislab_user': metadata.gislab_user,
        'publish_date': timezone.make_aware(datetime.datetime.fromtimestamp(metadata.publish_date_unix)),
        'last_display': timezone.now()
    }
    try:
        rows = Project_registry.objects.filter(project=project).update(**registry_info)
        if not rows:
            Project_registry(project=project, **registry_info).save()
    except:
        raise

    context['gislab_version'] = webgis.VERSION
    context['gislab_homepage'] = settings.GISQUICK_HOMEPAGE
    context['gislab_documentation'] = settings.GISQUICK_DOCUMENTATION_PAGE
    context['status'] = 200
    return context


def get_user_projects(request, username):
    projects = []
    projects_root = os.path.join(settings.GISQUICK_PROJECT_ROOT, username)
    project_prefix_length = len(os.path.join(settings.GISQUICK_PROJECT_ROOT, ''))
    for root, dirs, files in os.walk(projects_root, followlinks=True):
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

            for project_name, info in projects_files.items():
                # select last project version by timestamp
                last_project_filename = sorted(info, reverse=True)[0][1]

                project_filename = os.path.join(root, project_name)
                ows_project_filename = os.path.join(root, last_project_filename)
                project = clean_project_name(project_filename[project_prefix_length:])
                ows_project = clean_project_name(ows_project_filename[project_prefix_length:])
                metadata_filename = clean_project_name(ows_project_filename) + '.meta'
                try:
                    metadata = MetadataParser(metadata_filename)
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
                        'project': project,
                        'url': set_query_parameters('/', {'PROJECT': project}),
                        'ows_url': project_ows_url(ows_project),
                        'cache': metadata.use_mapcache,
                        'authentication': authentication,
                        'publication_time_unix': int(metadata.publish_date_unix),
                        'publication_time': metadata.publish_date,
                        'expiration_time': metadata.expiration if metadata.expiration else ''
                        #'expiration_time_unix': int(time.mktime(time.strptime(metadata.expiration, "%d.%m.%Y"))) if metadata.expiration else None
                    })
                except IOError:
                    # metadata file does not exists or not valid
                    pass
    return projects

