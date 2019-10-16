import json

from django.conf import settings
from django.shortcuts import render
from django.http import HttpResponse, JsonResponse
from django.contrib.auth import login
from django.contrib.auth.decorators import login_required
from django.contrib.auth import authenticate, login, logout
from django.views.decorators.csrf import csrf_exempt
from django.utils.translation import ugettext as _

import webgis
from webgis.viewer import models
from webgis.viewer import forms
from webgis.viewer.views.reverse import map_url
from webgis.viewer.views.project_utils import get_project, \
    get_user_data, InvalidProjectException
from django.views.generic.base import RedirectView


from django.views.decorators.csrf import ensure_csrf_cookie


class MapRedirectView(RedirectView):
    permanent = False
    query_string = True
    pattern_name = 'project_name'

    def get_redirect_url(self, *args, **kwargs):
        return "/?PROJECT={prefix}{project}".format(
            prefix=getattr(settings, 'GISQUICK_DEFAULT_PROJECT_NAMESPACE', ''),
            project=kwargs["project_name"])



@csrf_exempt
@ensure_csrf_cookie
def client_login(request):
    if request.method == 'POST':
        context_type = request.META['CONTENT_TYPE']
        if context_type.startswith('application/json'):
            data = json.loads(request.body)
        else:
            data = request.POST
        form = forms.LoginForm(data)
        if form.is_valid():
            username = form.cleaned_data['username']
            password = form.cleaned_data['password']
            user = authenticate(username=username, password=password)
            if user:
                try:
                    login(request, user)
                except Exception as e:
                    print (e)
                return JsonResponse(get_user_data(user))
    logout(request)
    return HttpResponse("Login Required", status=401)


def client_logout(request):
    logout(request)
    return HttpResponse(" ", status=200)


def map(request):
    data = {}
    try:
        data['user'] = get_user_data(request.user)
        data['project'] = get_project(request)
        data['app'] = {
            'lang': settings.LANGUAGE_CODE,
            'version': webgis.VERSION,
            'reset_password_url': getattr(settings, 'RESET_PASSWORD_URL', '')
        }

    except InvalidProjectException as e:
        return render(
            request,
            "viewer/4xx.html",
            {'message': "Error when loading project or project does not exist"},
            status=404,
            content_type="text/html"
        )

    templateData = {
        'data': data,
        'jsonData': json.dumps(data)
    }
    return render(
        request,
        "viewer/index.html",
        templateData,
        status=200,
        content_type="text/html"
    )

def dev_map(request):
    data = {
        'app': {
            'lang': settings.LANGUAGE_CODE,
            'version': webgis.VERSION,
            'reset_password_url': getattr(settings, 'RESET_PASSWORD_URL', '')
        },
        'project': get_project(request),
        'user': get_user_data(request.user)
    }
    return JsonResponse(data)
