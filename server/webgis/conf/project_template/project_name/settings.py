"""
Django settings for GIS.lab Web.
"""

import os

BASE_DIR = os.path.dirname(os.path.dirname(__file__))


### DEBUG ###
DEBUG = True


### GIS.lab Web ###
GISLAB_WEB_PROJECT_ROOT = '/tmp/qgis/publish/'
GISLAB_WEB_MAPSERVER_URL = 'http://localhost/cgi-bin/qgis_mapserv.fcgi'
GISLAB_WEB_GUEST_USERNAME = 'guest'

# Dictionary of <MIME Type>: <File extension> pairs
FILE_EXTENSIONS_TABLE = {
    "application/json": "json",
    "application/geojson": "geojson",
}


### DATABASE ###
DATABASES = {
	'default': {
		'ENGINE': 'django.db.backends.sqlite3',
		'NAME': os.path.join(BASE_DIR, 'webgis.sqlite3'),
	}
}


### INTERNATIONALIZATION ###
LANGUAGES = (
    ('en-us', u'English'),
)
LANGUAGE_CODE = 'en-us'
TIME_ZONE = 'Europe/Bratislava'
USE_I18N = True
USE_L10N = True
USE_TZ = True


### SECRET KEY ###
SECRET_KEY = '{{ secret_key }}'

### OTHER ###
ALLOWED_HOSTS = ['*']

# Enable CORS requests
CORS_ORIGIN_ALLOW_ALL = True
CORS_ALLOW_CREDENTIALS = True

STATIC_URL = '/static/'
STATIC_ROOT = os.path.join(BASE_DIR, 'static/')

MEDIA_URL = '/media/'

MEDIA_ROOT =  os.path.join(BASE_DIR, 'media/')


MIDDLEWARE_CLASSES = (
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.locale.LocaleMiddleware',
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'webgis.libs.middleware.WebgisHeaderMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
)

INSTALLED_APPS = (
    'corsheaders',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.staticfiles',
    'webgis.mapcache',
    'webgis.viewer',
    'webgis.mobile'
)

ROOT_URLCONF = '{{ project_name }}.urls'
WSGI_APPLICATION = '{{ project_name }}.wsgi.application'

LOGIN_URL = '/login/'
AUTH_USER_MODEL = 'viewer.GislabUser'



### CUSTOM SETTINGS ###
try:
    from settings_custom import *
except ImportError:
    pass

# vim: set syntax=sh ts=4 sts=4 sw=4 noet
