import json

from django.conf import settings
from django.shortcuts import render
from django.http import HttpResponse, JsonResponse
from django.contrib.auth import login
from django.core.urlresolvers import reverse
from django.contrib.auth.decorators import login_required
from django.contrib.auth import authenticate, login, logout
from django.views.decorators.csrf import csrf_exempt
from django.utils.translation import ugettext as _

import webgis
from webgis.viewer import models
from webgis.viewer import forms
from webgis.viewer.views.project_utils import get_project, get_user_projects, \
    get_user_data, InvalidProjectException
from webgis.libs.utils import secure_url, set_query_parameters



@csrf_exempt
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
            if username == "guest":
                user = models.GislabUser.get_guest_user()
            else:
                user = authenticate(username=username, password=password)
            if user:
                try:
                    login(request, user)
                except Exception as e:
                    print (e)
                return JsonResponse(get_user_data(user))
    logout(request)
    return HttpResponse(status=401)


def client_logout(request):
    logout(request)
    return HttpResponse(status=200)

def map(request):
    data = {}
    try:
        if not request.user.is_authenticated():
            user = models.GislabUser.get_guest_user()
            if user:
                login(request, user)
            else:
                raise RuntimeError("Anonymous user is not configured")
        data['user'] = get_user_data(request.user)
        data['project'] = get_project(request)

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


@login_required
def user_projects(request, username):
    if not request.user.is_authenticated() or request.user.is_guest:
        # redirect to login page
        login_url = secure_url(request, reverse('login'))
        return HttpResponseRedirect(
            set_query_parameters(login_url, {'next': secure_url(request)}))
    if not username:
        redirect_url = user_projects_url(request.user.username)
        return HttpResponseRedirect(redirect_url)
    if username != request.user.username:
        if not request.user.is_superuser:
            return HttpResponse(
                "Access Denied",
                content_type='text/plain',
                status=403
            )
        else:
            try:
                request.user = models.GislabUser.objects.get(username=username)
            except models.GislabUser.DoesNotExist:
                return HttpResponse(
                    "User does not exist.",
                    content_type='text/plain',
                    status=403
                )

    projects = [{
        'title': _('Empty Project'),
        'url': request.build_absolute_uri('/'),
    }]
    projects.extend(get_user_projects(request, username))
    data = {
        'username': username,
        'projects': projects,
        'gislab_version': webgis.VERSION,
        'gislab_homepage': settings.GISLAB_HOMEPAGE,
        'gislab_documentation': settings.GISLAB_DOCUMENTATION_PAGE,
        'user': get_user_data(request.user),
        'status': 200
    }
    templateData = {
        'data': data,
        'jsonData': json.dumps(data)
    }
    return render(
        request,
        "viewer/user_home.html",
        templateData,
        content_type="text/html"
    )
