import os
import logging

from django.core.exceptions import PermissionDenied
from django.http import JsonResponse, HttpResponse, Http404
from django.views.decorators.csrf import csrf_exempt, ensure_csrf_cookie
from django.contrib.auth import authenticate, login, logout

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


def user_info(request):
    if request.user.is_anonymous:
        return HttpResponse('Unauthorized', status=401)
    data = {
        "user": get_user_data(request.user)
    }
    return JsonResponse(data)
