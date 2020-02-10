import json

from django.conf import settings
from django.http import JsonResponse
from django.views.decorators.csrf import ensure_csrf_cookie
from django.contrib.auth import get_user_model

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
            'reset_password_url': '/api/accounts/reset_password/' if settings.GISQUICK_ACCOUNTS_ENABLED else ''
        },
        'user': get_user_data(request.user)
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


@login_required
def get_users(request):
    User = get_user_model()
    data = []
    for user in User.objects.all():
        data.append({
            "id": user.id,
            "username": user.username,
            "first_name": user.first_name,
            "last_name": user.last_name,
            "full_name": user.get_full_name()
        })
    return JsonResponse(data, safe=False)


def permission_denied(request, exception=None):
    return JsonResponse({"status": 403}, status=403)

def not_found(request, exception=None):
    return JsonResponse({"status": 404}, status=404)
