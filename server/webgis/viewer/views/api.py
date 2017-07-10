import os
import json
import hashlib
import subprocess

from django.views.generic import View
from django.conf import settings
from django.http import JsonResponse, HttpResponse, Http404, HttpResponseNotAllowed
from django.contrib.auth.decorators import login_required
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator

from webgis.mapcache import Disk
from webgis.viewer.views.project_utils import get_project, get_user_projects, \
    get_user_data, get_last_project_version, InvalidProjectException


@login_required
def user_json(request):
    user = request.user
    return JsonResponse(get_user_data(data))


@login_required
def project_json(request):
    try:
        project_data = get_project(request)
        return JsonResponse(project_data, status=project_data['status'])
    except InvalidProjectException:
        return HttpResponse('Not Found', status=404)


@login_required
def projects_json(request):
    projects = get_user_projects(request, request.user.username)
    data = {
        'projects': projects,
        'user': get_user_data(request.user)
    }
    return JsonResponse(data, safe=False)


@login_required
def update_table_templates(request):
    params = json.loads(request.body.decode('utf-8'))
    project = params['project']
    if request.method == 'POST' and project:
        ows_project = get_last_project_version(project)
        metafile = os.path.join(settings.GISQUICK_PROJECT_ROOT, ows_project+'.meta')
        with open(metafile, 'r+') as f:
            project = json.load(f)

            def inline_layers(layers, d={}):
                for layer in layers:
                    if 'layers' in layer:
                        inline_layers(layer['layers'], d)
                    else:
                        name = layer.get('serverName') or layer['name']
                        d[name] = layer
                return d

            layers = inline_layers(project['overlays'])
            # print('\n'.join(layers))

            templates_dir = os.path.join(os.path.dirname(metafile), 'info_panel')
            if os.path.exists(templates_dir):
                for filename in os.listdir(templates_dir):
                    lname = os.path.splitext(filename)[0]
                    if lname in layers:
                        layer = layers[lname]
                        with open(os.path.join(templates_dir, filename)) as temp:
                            template = temp.read()
                            layer['info_template'] = template
                    else:
                        print ('Warning: Unknown Layer Template: ', lname)
            else:
                # remove existing templates
                for layer in layers:
                    if 'info_template' in layer:
                        del layer['info_template']

        with open(metafile, 'w') as f:
            json.dump(project, f, indent=2)

        # return JsonResponse({})
        return HttpResponse(" ")
    raise Http404


class Project(View):

    @method_decorator(login_required)
    def dispatch(self, *args, **kwargs):
        return super(Project, self).dispatch(*args, **kwargs)

    def delete(self, request, project):
        username = project.split('/')[0]
        if username != request.user.username:
            return HttpResponseNotAllowed()

        project_dir = project.split('/')[1]
        project_dir = os.path.join(settings.GISQUICK_PROJECT_ROOT, username, project_dir)
        project_hash = hashlib.md5(project.encode('utf-8')).hexdigest()

        subprocess.Popen(["rm", "-rf", project_dir])
        mapcache = Disk(base=os.path.join(settings.MEDIA_ROOT, 'cache'))
        mapcache.delete_project_cache(project_hash)
        return HttpResponse(" ")

