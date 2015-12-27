import json

from django.conf import settings
from django.shortcuts import render
from django.http import HttpResponse, HttpResponseRedirect
from django.contrib.auth import login
from django.core.urlresolvers import reverse
from django.contrib.auth.decorators import login_required

from webgis.viewer import models
from webgis.viewer.views.project_utils import get_project, get_user_projects, \
    LoginRequiredException, AccessDeniedException, InvalidProjectException, \
    ProjectExpiredException
from webgis.libs.utils import secure_url, set_query_parameters


def map(request):
    try:
        project_data = get_project(request)
        return render(
            request,
            "viewer/index.html",
            {
                'user': request.user,
                'project': json.dumps(project_data)
            },
            content_type="text/html"
        )
    except LoginRequiredException:
        # redirect to login page
        return HttpResponseRedirect(
            set_query_parameters(
                reverse('login'),
                {'next': request.get_full_path()}
            )
        )
    except AccessDeniedException:
        msg = "You don't have permissions for this project"
        status = 403
    except InvalidProjectException:
        msg = "Error when loading project or project does not exist"
        status = 404
    except ProjectExpiredException:
        msg = "Project has reached expiration date.",
        status = 410
    except Exception, e:
        msg = "Server error"
        #TODO: log exception error
        raise
        status = 500
    return HttpResponse(msg, content_type='text/plain',status=status)


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
