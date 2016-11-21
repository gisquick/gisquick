from django.db import models
from django.conf import settings
from django.contrib.auth.models import AbstractUser


class GislabUser(AbstractUser):

    @classmethod
    def get_guest_user(cls):
        if getattr(settings, 'GISLAB_WEB_GUEST_USERNAME', None):
            if not hasattr(cls, 'guest_user'):
                guest_user = None
                try:
                    guest_user = GislabUser.objects.get(username=settings.GISLAB_WEB_GUEST_USERNAME)
                    guest_user.backend = "django.contrib.auth.backends.ModelBackend"
                except GislabUser.DoesNotExist:
                    pass
                cls.guest_user = guest_user
            return cls.guest_user

    @property
    def is_guest(self):
        return self.username == getattr(settings, 'GISLAB_WEB_GUEST_USERNAME', '')

    def get_profile(self):
        return None

    def get_full_name(self):
        full_name = super(GislabUser, self).get_full_name()
        return full_name or self.username

    def __unicode__(self):
        return self.username

class Project_registry(models.Model):
    project = models.TextField("project", primary_key=True)
    plugin_version = models.CharField("plugin version", max_length=255)
    gislab_user = models.CharField("gislab user", max_length=255)
    publish_date = models.DateTimeField("publish date")
    last_display = models.DateTimeField("last display", auto_now=True)


from django.db import connection
if GislabUser._meta.db_table in connection.introspection.table_names():
    guest_username = getattr(settings, 'GISLAB_WEB_GUEST_USERNAME', '')
    if guest_username:
        user, created = GislabUser.objects.get_or_create(username=guest_username, first_name=guest_username.title())
        user.set_unusable_password()
        user.save()
