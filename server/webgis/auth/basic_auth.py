import base64

from django.contrib.auth import authenticate
from django.contrib.auth.models import AnonymousUser


def is_authenticated(request):
    """Checks if a request is authenticated using HTTP Basic authentication method.

    If authentication succeeds, request's `user` attribute will be set with authenticated user's instance.

    :Parameters:
      - `request` (:class:`django.http.HttpRequest`) - HTTP request object

    :Returns:
        True if request was successfully authenticated

    :Returns Type:
        boolean
    """
    auth_string = request.META.get('HTTP_AUTHORIZATION', None)
    if not auth_string:
        return False

    (authmeth, auth) = auth_string.split(" ", 1)
    if not authmeth.lower() == 'basic':
        return False

    auth = base64.b64decode(auth.strip()).decode('utf-8')
    (username, password) = auth.split(':', 1)

    request.user = authenticate(username=username, password=password) or AnonymousUser()
    return not request.user in (False, None, AnonymousUser())
