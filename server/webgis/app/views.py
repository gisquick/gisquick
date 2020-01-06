import json

from django.conf import settings
from django.http import JsonResponse
from django.views.decorators.csrf import ensure_csrf_cookie

import webgis
from webgis.map.project import get_project, get_user_projects
from webgis.auth.decorators import login_required
from webgis.auth.utils import get_user_data


@ensure_csrf_cookie
def app(request):
    data = {
        'app': {
            'lang': settings.LANGUAGE_CODE,
            'version': webgis.VERSION,
            'reset_password_url': getattr(settings, 'RESET_PASSWORD_URL', '')
        },
        'user': get_user_data(request.user)
    }
    return JsonResponse(data)

def map_app(request):
    data = {
        'app': {
            'lang': settings.LANGUAGE_CODE,
            'version': webgis.VERSION,
            'reset_password_url': getattr(settings, 'RESET_PASSWORD_URL', '')
        },
        'user': get_user_data(request.user),
        'project': get_project(request)
    }
    return JsonResponse(data)

@login_required
def get_projects(request):
    data = {
        'projects': get_user_projects(request, request.user.username)
    }
    return JsonResponse(data, safe=False)


@login_required
def user_projects(request, username):
    if not request.user.is_superuser:
        raise PermissionDenied

    data = {
        'projects': get_user_projects(request, username)
    }
    return JsonResponse(data, safe=False)


def permission_denied(request, exception=None):
    return JsonResponse({"status": 403}, status=403)

def not_found(request, exception=None):
    return JsonResponse({"status": 404}, status=404)
