import os
import zipfile
import tarfile

from django import forms
from django.conf import settings
from django.template.defaultfilters import filesizeformat
from django.utils.translation import ugettext_lazy as _


def _total_size(source):
    total_size = os.path.getsize(source)
    for item in os.listdir(source):
        itempath = os.path.join(source, item)
        if os.path.isfile(itempath):
            total_size += os.path.getsize(itempath)
        elif os.path.isdir(itempath):
            total_size += _total_size(itempath)
    return total_size


class UploadForm(forms.Form):
    UPLOAD_FILE_TYPES = ['zip', 'x-compressed-tar', 'gzip']
    proj_file = forms.FileField()


    def __init__(self, request, *args, **kwargs):
        self.request = request
        super(UploadForm, self).__init__(*args, **kwargs)

    def clean(self):
        # projects_dir = os.path.join(settings.GISQUICK_PROJECT_ROOT, self.request.user.username)
        # size_in_mb = _total_size(projects_dir)/(1024*1024)
        # if size_in_mb > settings.GISQUICK_UPLOAD_SPACE_LIMIT:
            # raise forms.ValidationError(_('You have reached disk space limit for uploading projects'))

        # projects_count = len(os.listdir(projects_dir))
        # print('projects count', projects_count)
        # if projects_count >= settings.GISQUICK_UPLOAD_LIMIT and not self.request.user.is_staff:
        #     raise forms.ValidationError(_('You have reached maximal number of uploaded projects'))

        max_size = getattr(settings, 'GISQUICK_UPLOAD_MAX_SIZE', None)
        if isinstance(max_size, str):
            if max_size[-1].upper() == 'M':
                max_size = int(max_size[:-1]) * 1024 * 1024
            else:
                max_size = int(max_size)
            # units = {'K': 1024, 'M': 1024*1024}
            # unit = max_size[-1].upper()
            # if unit in units:
            #     max_size = int(max_size[:-1]) * units[unit]

        try:
            file = self.cleaned_data['proj_file']
            if file:
                file_type = file.content_type.split('/')[-1]
                if file_type in self.UPLOAD_FILE_TYPES:
                    if max_size and file._size > max_size:
                        raise forms.ValidationError(_('Please keep file size under %s MB. Current file size %s') %
                                                    (filesizeformat(settings.GISQUICK_UPLOAD_MAX_SIZE),
                                                     filesizeformat(file._size)))
                else:
                    raise forms.ValidationError(_('File type not supported.'))
        except KeyError:
            raise forms.ValidationError(_('No file selected.'))

    def extract(self):
        file = self.cleaned_data['proj_file']
        dest_dir = os.path.join(settings.GISQUICK_PROJECT_ROOT, self.request.user.username)
        if file.name.endswith('.zip'):
            zip_ref = zipfile.ZipFile(file)
            zip_ref.extractall(dest_dir)
            zip_ref.close()
        elif file.name.endswith('.gz'):
            file.seekable = lambda: True
            tar_ref = tarfile.open(fileobj=file)
            tar_ref.extractall(dest_dir)
            tar_ref.close()
        else:
            raise IOError('Unable to extract file.')
