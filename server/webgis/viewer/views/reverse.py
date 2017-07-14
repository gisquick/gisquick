import hashlib

from django.core.urlresolvers import reverse

from webgis.libs.utils import set_query_parameters


def map_url():
    return reverse('viewer:map')

def project_ows_url(ows_project):
    return set_query_parameters(
        reverse('viewer:ows'),
        {'MAP': ows_project+'.qgs'}
    )


def project_vectorlayers_url(ows_project):
    return set_query_parameters(
        reverse('viewer:vectorlayers'),
        {'PROJECT': ows_project}
    )


def project_tile_url(project, timestamp):
    project_hash = hashlib.md5(project.encode('utf-8')).hexdigest()
    mapcache_url = reverse(
        'viewer:tile',
        kwargs={
            'project_hash': project_hash,
            'publish': timestamp,
            'layers_hash': '__layers__',
            'x': 0,
            'y': 0,
            'z': 0,
            'format': 'png'
        }
    )
    return mapcache_url.split('/__layers__/')[0]+'/'


def project_legend_url(project, timestamp):
    project_hash = hashlib.md5(project.encode('utf-8')).hexdigest()
    legend_url = reverse(
        'viewer:legend',
        kwargs={
            'project_hash': project_hash,
            'publish': timestamp,
            'layer_hash': '__layer__',
            'zoom': 0,
            'format': 'png'
        }
    )
    return legend_url.split('/__layer__/')[0]+'/'
