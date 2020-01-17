from django.conf import settings
from django.urls import include, re_path, path
from django.contrib.staticfiles.urls import staticfiles_urlpatterns
from django.conf.urls.static import static
from django.contrib import admin


handler403 = 'webgis.app.views.permission_denied'
handler404 = 'webgis.app.views.not_found'

urlpatterns = [
    path('api/auth/', include('webgis.auth.urls')),
    path('api/map/', include('webgis.map.urls')),
    path('api/', include('webgis.app.urls')),
    path('admin/', admin.site.urls)
]

if getattr(settings, 'GISQUICK_ACCOUNTS_ENABLED', False):
    urlpatterns += [
        path('api/accounts/', include('webgis.accounts.urls'))
    ]

from {{ project_name }}.urls_custom import urlpatterns as custom_urlpatterns
urlpatterns += custom_urlpatterns

if settings.DEBUG:
    urlpatterns += staticfiles_urlpatterns()
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
