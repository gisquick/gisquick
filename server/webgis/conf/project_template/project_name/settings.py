"""
Django settings for GIS.lab Web.
"""

import os
BASE_DIR = os.path.dirname(os.path.dirname(__file__))


### DEBUG
DEBUG = True


### DATABASE
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': os.path.join(BASE_DIR, 'webgis.sqlite3'),
    }
}


### SECRET KEY
SECRET_KEY = '{{ secret_key }}'


### GIS.LAB WEB CONFIGURATION

# Set true for https scheme
GISLAB_WEB_SECURE_URL = True
GISLAB_WEB_PROJECT_ROOT = '/tmp/gislab-web'
GISLAB_WEB_MAPSERVER_URL = 'http://localhost:90/cgi-bin/qgis_mapserv.fcgi'
GISLAB_WEB_GUEST_USERNAME = 'guest'
GISLAB_HOMEPAGE = 'http://github.com/gislab-npo/gislab-web/'
GISLAB_DOCUMENTATION_PAGE = 'http://gislab.readthedocs.io/en/latest/gislab-web/index.html'


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
    'webgis.mapcache',
    'webgis.viewer',
    'webgis.mobile'
)

ROOT_URLCONF = '{{ project_name }}.urls'
WSGI_APPLICATION = '{{ project_name }}.wsgi.application'

AUTH_USER_MODEL = 'viewer.GislabUser'


### CUSTOM SETTINGS
try:
    from {{ project_name }}.settings_custom import *
except ImportError:
    pass

# vim: set ts=8 sts=4 sw=4 et:
