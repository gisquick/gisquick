from django.http import JsonResponse, HttpResponse, Http404
from django.contrib.auth.decorators import login_required
from django.core.exceptions import PermissionDenied

from webgis.viewer.views.project_utils import get_project, \
    get_user_projects, get_user_data, InvalidProjectException


# TODO: replace or set login_required to return 401 response instead of redirect
# @login_required
def user_json(request):
    if request.user.is_anonymous():
        return HttpResponse('Unauthorized', status=401)
    data = {
        "user": get_user_data(request.user)
    }
    return JsonResponse(data)


@login_required
def project_json(request):
    try:
        project_data = get_project(request)
        return JsonResponse(project_data, status=project_data['status'])
    except InvalidProjectException:
        raise Http404


@login_required
def projects_json(request):
    projects = get_user_projects(request, request.user.username)
    data = {
        'projects': projects,
        'user': get_user_data(request.user)
    }
    return JsonResponse(data, safe=False)


@login_required
def user_projects_json(request, username):
    if not request.user.is_superuser:
        raise PermissionDenied

    projects = get_user_projects(request, username)
    data = {
        'projects': projects,
        'user': get_user_data(request.user)
    }
    return JsonResponse(data, safe=False)
