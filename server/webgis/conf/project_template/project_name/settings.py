"""
Django settings for Gisquick.
"""

import os
import logging

logger = logging.getLogger('django')
BASE_DIR = os.path.dirname(os.path.dirname(__file__))


### DEBUG
DEBUG = True


### DATABASE
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': os.path.join(BASE_DIR, 'gisquick.sqlite3'),
    }
}


### SECRET KEY
SECRET_KEY = '{{ secret_key }}'


### GISQUICK CONFIGURATION

GISQUICK_PROJECT_ROOT = '/tmp/gislab-web'
GISQUICK_MAPSERVER_URL = 'http://localhost:90/cgi-bin/qgis_mapserv.fcgi'
GISQUICK_HOMEPAGE = 'http://gisquick.org'
GISQUICK_DOCUMENTATION_PAGE = 'http://gisquick.readthedocs.io/en/latest/user-manual/user-interface.html'

# Optional limit for maximal uploaded project files
# Integer in bytes or string number in megabytes (50M)
# GISQUICK_UPLOAD_MAX_SIZE = '10M'


### INTERNATIONALIZATION
LANGUAGES = (
    ('en-us', 'English'),
)
LANGUAGE_CODE = 'en-us'
TIME_ZONE = 'Europe/Bratislava'
USE_I18N = True
USE_L10N = True
USE_TZ = True


### OTHER
ALLOWED_HOSTS = ['*']

STATIC_URL = '/static/'
STATIC_ROOT = os.path.join(BASE_DIR, 'static/')

MEDIA_URL = '/media/'
MEDIA_ROOT =  os.path.join(BASE_DIR, 'media/')


### SYSTEM CONFIGURATION
MIDDLEWARE_CLASSES = (
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.locale.LocaleMiddleware',
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'webgis.libs.middleware.WebgisHeaderMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
)

# enable CORS requests
CORS_ORIGIN_ALLOW_ALL = True
CORS_ALLOW_CREDENTIALS = True

INSTALLED_APPS = (
    'corsheaders',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.staticfiles',
    'django.contrib.admin',
    'webgis.mapcache',
    'webgis.viewer',
    'webgis.userpage',
    'webgis.mobile'
)

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [
            # insert your TEMPLATE_DIRS here
        ],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                # Insert your TEMPLATE_CONTEXT_PROCESSORS here or use this
                # list if you haven't customized them:
                'django.contrib.auth.context_processors.auth',
                'django.template.context_processors.debug',
                'django.template.context_processors.media',
                'django.template.context_processors.static',
                #'django.template.context_processors.tz',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

ROOT_URLCONF = '{{ project_name }}.urls'
WSGI_APPLICATION = '{{ project_name }}.wsgi.application'

AUTH_USER_MODEL = 'viewer.GisquickUser'


### CUSTOM SETTINGS
try:
    from {{ project_name }}.settings_custom import *
except ImportError:
    pass


### ENVIRONMENT VARIABLES SETTINGS
for k, v in os.environ.items():
    if k.startswith("DJANGO_"):
        if v:
            if v[0] in ("'", '"'):
                v = v[1:-1]
            else:
                try:
                    if v in ('True', 'False'):
                        v = True if v == 'True' else False
                    elif '.' in v:
                        v = float(v)
                    else:
                        v = int(v)
                except ValueError:
                    # let it be a string
                    if k != 'DJANGO_SETTINGS_MODULE':
                        logger.warn('Warning: {0} - Invalid number value, converting to string'.format(k))
        key = k.split('_', 1)[1]
        globals()[key] = v

# vim: set ts=8 sts=4 sw=4 et:
