from django.contrib import admin
from django.contrib.auth.admin import UserAdmin


from .models import GisquickUser
admin.site.register(GisquickUser, UserAdmin)