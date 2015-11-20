from functools import wraps

from django.http import HttpResponse
from django.views.decorators.vary import vary_on_headers
from django.utils.decorators import available_attrs

from webgis.libs.auth.basic import is_authenticated


def basic_authentication(realm='API'):
    """Decorator for views that authenticates user through HTTP Basic authentication, 
    returning HTTP 401 Not Authorized response when the authentication fails.

    :Parameters:
      - `realm` (string) - the realm attribute which defines the protection space (used in 'WWW-Authenticate' header value)
    """
    def inner_decorator(fn):
        @vary_on_headers('Authorization')
        def wrapped(request, *args, **kwargs):
            if (request.user and request.user.is_authenticated()) or is_authenticated(request):
                return fn(request, *args, **kwargs)
            else:
                response = HttpResponse('Authentication required', status=401)
                response['WWW-Authenticate'] = 'Basic realm={0}'.format(realm)
                return response
        return wraps(fn, assigned=available_attrs(fn))(wrapped)
    return inner_decorator
