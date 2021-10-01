import os
import logging

from django.core.exceptions import PermissionDenied
from django.http import JsonResponse, HttpResponse, Http404
from django.views.decorators.csrf import csrf_exempt, ensure_csrf_cookie
from django.contrib.auth import authenticate, login, logout
from django.contrib.auth import get_user_model

from . import forms
from webgis.auth.utils import get_user_data

logger = logging.getLogger('gisquick.auth')


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
            if '@' in username:
                User = get_user_model()
                users = User.objects.filter(email__iexact=username)
                if len(users) > 1:
                    return HttpResponse('Conflict', status=409)
                user = users[0] if users and users[0].check_password(password) else None
            else:
                user = authenticate(username=username, password=password)
            if user and user.is_active:
                try:
                    login(request, user)
                    return JsonResponse(get_user_data(user))
                except Exception as e:
                    pass
            return HttpResponse('Authentication failed', status=401)
    logout(request)
    return HttpResponse('Login Required', status=401)


def client_logout(request):
    logout(request)
    return HttpResponse(' ', status=200)


def user_info(request):
    if request.user.is_anonymous:
        return HttpResponse('Unauthorized', status=401)
    data = {
        'user': get_user_data(request.user)
    }
    return JsonResponse(data)


def is_authenticated(request):
    if request.user.is_anonymous:
        return HttpResponse('Unauthorized', status=401)
    return HttpResponse()


def is_admin(request):
    if not request.user.is_staff:
        return HttpResponse('Unauthorized', status=401)
    return HttpResponse()
