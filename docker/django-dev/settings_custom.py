import os
from django.conf import settings

BASE_DIR = os.path.dirname(os.path.dirname(__file__))


GISQUICK_PROJECT_ROOT = '/publish/'
GISQUICK_MAPSERVER_URL = 'http://qgisserver:90/cgi-bin/qgis_mapserv.fcgi'

### DATABASE
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': os.path.join(BASE_DIR, 'data', 'gisquick.sqlite3'),
    }
}

# INSTALLED_APPS = settings.INSTALLED_APPS + ('sslserver',)


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