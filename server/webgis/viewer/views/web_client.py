import json

from django.conf import settings
from django.shortcuts import render
from django.http import HttpResponse, JsonResponse
from django.contrib.auth import login
from django.core.urlresolvers import reverse
from django.contrib.auth.decorators import login_required
from django.contrib.auth import authenticate, login, logout
from django.views.decorators.csrf import csrf_exempt

from webgis.viewer import models
from webgis.viewer import forms
from webgis.viewer.views.project_utils import get_project, get_user_projects, \
    InvalidProjectException
from webgis.libs.utils import secure_url, set_query_parameters


def get_user_data(user):
    return {
        'username': user.username,
        'first_name': user.first_name,
        'last_name': user.last_name,
        'is_guest': user.is_guest
    }

@csrf_exempt
def client_login(request):
    if request.method == 'POST':
        data = json.loads(request.body)
        form = forms.LoginForm(data)
        if form.is_valid():
            username = form.cleaned_data['username']
            password = form.cleaned_data['password']
            if username == "guest":
                print "login as guest"
                user = models.GislabUser.get_guest_user()
            else:
                user = authenticate(username=username, password=password)
            if user:
                try:
                    login(request, user)
                except Exception, e:
                    print e
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

    except InvalidProjectException:
        raiseHttp404
    except Exception, e:
        #TODO: log exception error
        raise

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
    context = {
        'username': username,
        'projects': projects,
        'debug': settings.DEBUG
    }
    return render(
        request,
        "viewer/user_projects.html",
        context,
        content_type="text/html"
    )
