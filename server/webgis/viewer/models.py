from django.db import models
from django.conf import settings
from django.contrib.auth.models import AbstractUser


class GisquickUser(AbstractUser):

    def get_profile(self):
        return None

    def get_full_name(self):
        full_name = super(GisquickUser, self).get_full_name()
        return full_name or self.username

    def __unicode__(self):
        return self.username

class Project_registry(models.Model):
    project = models.TextField("project", primary_key=True)
    plugin_version = models.CharField("plugin version", max_length=255)
    gislab_user = models.CharField("gislab user", max_length=255)
    publish_date = models.DateTimeField("publish date")
    last_display = models.DateTimeField("last display", auto_now=True)
