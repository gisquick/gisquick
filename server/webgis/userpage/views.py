import os
import json
import hashlib
import subprocess
import logging

from django.conf import settings
from django.shortcuts import render
from django.views.generic import View
from django.core.exceptions import PermissionDenied
from django.http import JsonResponse, HttpResponse, Http404, HttpResponseRedirect
from django.contrib.auth.decorators import login_required
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator
from django.utils.translation import ugettext as _
from django.core.urlresolvers import reverse

import webgis
from webgis.viewer import models
from .forms import UploadForm
from webgis.mapcache import Disk
from webgis.viewer.views.project_utils import get_user_projects, \
    get_user_data, get_last_project_version


logger = logging.getLogger('django')

def user_projects(request, username):
    data = {}
    if not request.user.is_authenticated():
        data['status'] = 401
    else:
        if not username:
            redirect_url = reverse(
                'userpage:user_projects',
                kwargs={'username': request.user.username}
            )
            return HttpResponseRedirect(redirect_url)

        if username == request.user.username or request.user.is_superuser:
            # projects = [{
            #     'title': _('Empty Project'),
            #     'url': request.build_absolute_uri('/'),
            # }]
            # projects.extend(get_user_projects(request, username))
            projects = get_user_projects(request, username)
            data.update({
                'username': username,
                'projects': projects,
                'gislab_version': webgis.VERSION,
                'gislab_homepage': settings.GISQUICK_HOMEPAGE,
                'gislab_documentation': settings.GISQUICK_DOCUMENTATION_PAGE,
                'user': get_user_data(request.user),
                'status': 200
            })
        else:
            try:
                request.user = models.GisquickUser.objects.get(username=username)
            except models.GisquickUser.DoesNotExist:
                return HttpResponse(
                    "User does not exist.",
                    content_type='text/plain',
                    status=403
                )
            data['status'] = 403

    templateData = {
        'data': data,
        'jsonData': json.dumps(data)
    }

    return render(
        request,
        "userpage/index.html",
        templateData,
        content_type="text/html"
    )


# @csrf_exempt
def upload_file(request):
    context = {}
    if request.method == 'POST':
        form = UploadForm(request, request.POST, request.FILES)
        if form.is_valid():
            f = form.extract()
            return JsonResponse({'status': '200'})
        else:
            return HttpResponse(
                form.errors.as_json(),
                content_type='application/json',
                status=409
            )

    raise Http404

@login_required
# @csrf_exempt
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
                # for lname in layers:
                #     layer = layers[lname]
                #     with open(os.path.join(templates_dir, 'general.html')) as temp:
                #         template = temp.read()
                #         layer['info_template'] = template

                for filename in filter(lambda f: f.endswith('.html'), os.listdir(templates_dir)):
                    lname = os.path.splitext(filename)[0]
                    if lname in layers:
                        layer = layers[lname]
                        with open(os.path.join(templates_dir, filename)) as temp:
                            template = temp.read()
                            layer['info_template'] = template
                    else:
                        logging.warn('Unknown Layer Template: %s', lname)
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
        if username != request.user.username or username.startswith('user'):
            raise PermissionDenied

        project_dir = project.split('/')[1]
        project_dir = os.path.join(settings.GISQUICK_PROJECT_ROOT, username, project_dir)
        project_hash = hashlib.md5(project.encode('utf-8')).hexdigest()

        subprocess.Popen(["rm", "-rf", project_dir])
        mapcache = Disk(base=os.path.join(settings.MEDIA_ROOT, 'cache'))
        mapcache.delete_project_cache(project_hash)
        return HttpResponse(" ")
