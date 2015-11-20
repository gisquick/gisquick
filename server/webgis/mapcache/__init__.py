# -*- coding: utf-8 -*-


import os.path

from django.conf import settings
from django.http import HttpResponse

from webgis.mapcache.layer import Tile, TileNotFoundException
from webgis.mapcache.layers.wms import WmsLayer
from webgis.mapcache.caches.disk import Disk


def get_tile_response(layer, z=0, x=0, y=0):
    tile = Tile(layer, int(x), int(y), int(z))
    cache = Disk(base=os.path.join(settings.MEDIA_ROOT, 'cache'))
    layer.cache = cache

    image = cache.get_tile(tile)
    if not image:
        data = layer.render(tile)
        if not data:
            raise Exception("Zero length data returned from layer.")
    layer = tile.layer
    resp = HttpResponse(tile.data, content_type=layer.format())
    #resp['Content-Length'] = len(image)
    return resp

def get_legendgraphic_response(layer, zoom, **params):
    cache = Disk(base=os.path.join(settings.MEDIA_ROOT, 'cache'))
    layer.cache = cache
    image = cache.get_legend(layer, zoom)
    if not image:
        image = layer.render_legend(zoom, **params)
        if not image:
            raise Exception("Zero length data returned from layer.")
    resp = HttpResponse(image, content_type=layer.format())
    return resp
