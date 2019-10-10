from django.conf import settings
from django.conf.urls import include, url
from django.contrib.staticfiles.urls import staticfiles_urlpatterns
from django.views.i18n import javascript_catalog
from django.conf.urls.static import static
from django.contrib.auth.views import login, logout
from django.contrib import admin


js_info_dict = {
    'packages': ('webgis.viewer',),
}

urlpatterns = [
    url(r'', include('webgis.viewer.urls', namespace='viewer')),
    url(r'', include('webgis.userpage.urls', namespace='userpage')),
    url(r'^mobile/', include('webgis.mobile.urls', namespace='mobile')),
    url(r'^login/$', login, name='login'),
    url(r'^logout/$', logout, name='logout'),
    url(r'^jsi18n/$', javascript_catalog, js_info_dict),
    url(r'^admin/', include(admin.site.urls))
]

if settings.DEBUG:
    urlpatterns += staticfiles_urlpatterns()
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)

try:
    from {{ project_name }}.urls_custom import urlpatterns as custom_urlpatterns
    urlpatterns += custom_urlpatterns
except ImportError:
    pass
