import os

BASE_DIR = os.path.dirname(os.path.dirname(__file__))


DEBUG = False

GISQUICK_PROJECT_ROOT = '/publish/'
GISQUICK_MAPSERVER_URL = 'http://qgisserver:90/cgi-bin/qgis_mapserv.fcgi'

SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')

### DATABASE
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': os.path.join(BASE_DIR, 'data', 'gisquick.sqlite3'),
    }
}

LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'handlers': {
        'console': {
            'level': 'INFO',
            'class': 'logging.StreamHandler'
        },
    },
    'loggers': {
        'django': {
            'handlers': ['console'],
            'level': 'INFO',
            'propagate': True
        }
    }
}