from django.http import JsonResponse, HttpResponse
from django.contrib.auth.decorators import login_required

from webgis.viewer.views.project_utils import get_project, InvalidProjectException


@login_required
def user_json(request):
    user = request.user
    data = {
        'username': user.username,
        'first_name': user.first_name,
        'last_name': user.last_name,
        'email': user.email,
        'is_superuser': user.is_superuser
    }
    return JsonResponse(data)


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
    return JsonResponse(projects)


def gislab_version_json(request):
    #data = webgis.GISLAB_VERSION
    return JsonResponse(data)
