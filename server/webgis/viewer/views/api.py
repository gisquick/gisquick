from django.http import JsonResponse, HttpResponse
from django.contrib.auth.decorators import login_required

from webgis.viewer.views.project_utils import get_project, get_user_projects, \
    get_user_data, InvalidProjectException


@login_required
def user_json(request):
    user = request.user
    return JsonResponse(get_user_data(data))


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
    data = {
        'projects': projects,
        'user': get_user_data(request.user)
    }
    return JsonResponse(data, safe=False)
