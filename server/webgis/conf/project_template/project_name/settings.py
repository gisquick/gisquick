"""
Django settings for Gisquick.
"""

import os

ROOT_URLCONF = '{{ project_name }}.urls'
WSGI_APPLICATION = '{{ project_name }}.wsgi.application'

AUTH_USER_MODEL = 'app.User'


### INTERNATIONALIZATION
LANGUAGES = (
    ('en-us', 'English'),
)
LANGUAGE_CODE = 'en-us'
TIME_ZONE = 'Europe/Bratislava'
USE_I18N = True
USE_L10N = True
USE_TZ = True


### SYSTEM CONFIGURATION
MIDDLEWARE = (
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.locale.LocaleMiddleware',
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'webgis.libs.middleware.WebgisHeaderMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
)

INSTALLED_APPS = [
    'corsheaders',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.staticfiles',
    'django.contrib.messages',
    'django.contrib.admin',
    'webgis.app'
]

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

### OTHER
ALLOWED_HOSTS = ['*']

# enable CORS requests
CORS_ORIGIN_ALLOW_ALL = True
CORS_ALLOW_CREDENTIALS = True

GISQUICK_HOMEPAGE = 'http://gisquick.org'
GISQUICK_DOCUMENTATION_PAGE = 'http://gisquick.readthedocs.io/en/latest/user-manual/user-interface.html'
GISQUICK_ACCOUNTS_ENABLED = False
GISQUICK_SQLITE_DB = None

### CUSTOM SETTINGS
from {{ project_name }}.custom import *


### LOAD SETTINGS FROM ENVIRONMENT VARIABLES
for k, v in os.environ.items():
    if k.startswith("DJANGO_") or k.startswith("GISQUICK_"):
        if v:
            try:
                if v in ('True', 'False'):
                    v = True if v == 'True' else False
                elif '.' in v:
                    v = float(v)
                else:
                    v = int(v)
            except ValueError:
                # let it be a string
                pass
        if k.startswith("DJANGO_"):
            k = k.split('_', 1)[1]
        globals()[k] = v


### After settings
if GISQUICK_ACCOUNTS_ENABLED:
    INSTALLED_APPS += ['webgis.accounts']

