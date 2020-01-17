import os
import hashlib
import subprocess
import logging

from django.conf import settings
from django.views.generic import View
from django.core.exceptions import PermissionDenied
from django.http import HttpResponse
from django.utils.decorators import method_decorator

from webgis.mapcache import Disk
from webgis.auth.decorators import login_required


logger = logging.getLogger('gisquick.userpage')

class Project(View):

    @method_decorator(login_required)
    def dispatch(self, *args, **kwargs):
        return super(Project, self).dispatch(*args, **kwargs)

    def delete(self, request, project):
        username = project.split('/')[0]
        if username != request.user.username or username.startswith('user'):
            raise PermissionDenied

        project_dir = project.split('/')[1]
        project_dir = os.path.join(settings.GISQUICK_PROJECT_ROOT, username, project_dir)
        project_hash = hashlib.md5(project.encode('utf-8')).hexdigest()

        subprocess.Popen(["rm", "-rf", project_dir])
        mapcache = Disk(base=os.path.join(settings.MEDIA_ROOT, 'cache'))
        mapcache.delete_project_cache(project_hash)
        return HttpResponse(" ")

