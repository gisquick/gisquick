VERSION = ('dev',)

# Temporary fix for invalid GetCapabilities response from
# qgis server 2.8.1+. This code will enable multi-threading
# in development server - sslrunserver and set path for SSL
# certificate for Python's 'requests' library used by Owslib.
# It will allow to send HTTPS requests to itself (from devserver
# to devserver).
try:
    from django.conf import settings
    if settings.DEBUG:
        import requests
        from django.utils.six.moves import socketserver
        from django.core.servers.basehttp import WSGIServer

        WSGIServer.__bases__ = (socketserver.ThreadingMixIn, ) + WSGIServer.__bases__
        requests.adapters.DEFAULT_CA_BUNDLE_PATH="/home/vagrant/.virtualenvs/gislab-web/local/lib/python2.7/site-packages/sslserver/certs/development.crt"
except:
    pass