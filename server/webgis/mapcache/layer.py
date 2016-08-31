# BSD Licensed, Copyright (c) 2006-2008 MetaCarta, Inc.

import sys
from io import BytesIO
from PIL import Image, ImageEnhance


class TileNotFoundException(Exception): pass


class Tile (object):
    __slots__ = ( "layer", "x", "y", "z", "data" )

    def __init__ (self, layer, x, y, z):
        self.layer = layer
        self.x = x
        self.y = y
        self.z = z
        self.data = None

    def size (self):
        return self.layer.tile_size

    def bounds (self):
        res  = self.layer.resolutions[self.z]
        minx = self.layer.extent[0] + (res * self.x * self.layer.tile_size)
        miny = self.layer.extent[1] + (res * self.y * self.layer.tile_size)
        maxx = self.layer.extent[0] + (res * (self.x + 1) * self.layer.tile_size)
        maxy = self.layer.extent[1] + (res * (self.y + 1) * self.layer.tile_size)
        return (minx, miny, maxx, maxy)

    def extent (self):
        return ",".join(map(str, self.bounds()))

class MetaTile (Tile):
    def actual_size (self):
        meta_cols, meta_rows = self.layer.get_meta_size(self.z)
        return ( self.layer.tile_size * meta_cols,
                 self.layer.tile_size * meta_rows )

    def size (self):
        actual = self.actual_size()
        return ( actual[0] + self.layer.metabuffer[0] * 2, 
                 actual[1] + self.layer.metabuffer[1] * 2 )

    def bounds (self):
        tilesize   = self.actual_size()
        res           = self.layer.resolutions[self.z]
        buffer       = (res * self.layer.metabuffer[0], res * self.layer.metabuffer[1])
        metaWidth  = res * tilesize[0]
        meta_height = res * tilesize[1]
        minx = self.layer.extent[0] + self.x * metaWidth    - buffer[0]
        miny = self.layer.extent[1] + self.y * meta_height - buffer[1]
        maxx = minx + metaWidth  + 2 * buffer[0]
        maxy = miny + meta_height + 2 * buffer[1]
        return (minx, miny, maxx, maxy)

class Layer (object):
    __slots__ = ( "project", "publish", "name", "provider_layers", "extent",
                  "tile_size", "resolutions", "image_format", "projection",
                  'metasize', 'metabuffer',
                  "cache")

    def __init__ (self, project, publish, name, provider_layers = None, extent = (-180, -90, 180, 90),
                        projection  = "EPSG:4326", tile_size = 256, resolutions = None,
                        image_format = "png", metasize = 5, metabuffer = 0, cache = None,
                        **kwargs):
        self.project = project
        self.publish = publish
        self.name = name
        self.provider_layers = provider_layers or name

        if isinstance(extent, str):
            extent = list(map(float, extent.split(",")))

        self.extent = extent
        self.tile_size = tile_size
        self.projection  = projection

        if image_format.lower() == 'jpg': 
            image_format = 'jpeg' # MIME
        self.image_format = image_format.lower()

        self.metasize = (metasize, metasize)
        self.metabuffer = (metabuffer, metabuffer)
        self.cache = cache

        if isinstance(resolutions, str):
            resolutions = list(map(float,resolutions.split(",")))
        self.resolutions = resolutions

    def grid (self, z):
        try:
            width  = (self.extent[2] - self.extent[0]) / (self.resolutions[z] * self.tile_size)
            height = (self.extent[3] - self.extent[1]) / (self.resolutions[z] * self.tile_size)
        except IndexError:
            raise TileNotFoundException("Requested zoom level %s does not exist" % z)
        return (width, height)

    def format (self):
        return "image/" + self.image_format

    def get_meta_size (self, z):
        maxcol, maxrow = self.grid(z)
        return ( min(self.metasize[0], int(maxcol + 1)), 
                 min(self.metasize[1], int(maxrow + 1)) )

    def get_meta_tile (self, tile):
        x = int(tile.x / self.metasize[0])
        y = int(tile.y / self.metasize[1])
        return MetaTile(self, x, y, tile.z) 

    def render_meta_tile (self, metatile, tile):
        data = self.render_tile(metatile)
        image = Image.open( BytesIO(data) )

        meta_cols, meta_rows = self.get_meta_size(metatile.z)
        meta_height = meta_rows * self.tile_size + 2 * self.metabuffer[1]
        for i in range(meta_cols):
            for j in range(meta_rows):
                minx = i * self.tile_size + self.metabuffer[0]
                maxx = minx + self.tile_size
                ### this next calculation is because image origin is (top,left)
                maxy = meta_height - (j * self.tile_size + self.metabuffer[1])
                miny = maxy - self.tile_size
                subimage = image.crop((minx, miny, maxx, maxy))
                subimage.info = image.info
                buffer = BytesIO()
                subimage.save(buffer, self.image_format, quality=85)
                buffer.seek(0)
                subdata = buffer.read()
                x = metatile.x * self.metasize[0] + i
                y = metatile.y * self.metasize[1] + j
                subtile = Tile( self, x, y, metatile.z )
                subtile.data = subdata
                self.cache.set_tile( subtile )
                if x == tile.x and y == tile.y:
                    tile.data = subdata

        return tile.data

    def render (self, tile, force=False):
        metatile = self.get_meta_tile(tile)
        try:
            self.cache.lock_tile(metatile)
            image = None
            if not force:
                image = self.cache.get_tile(tile)
            if not image:
                image = self.render_meta_tile(metatile, tile)
        finally:
            self.cache.unlock_tile(metatile)
        return image

    def render_legend(self, z, **params):
        image = None
        try:
            self.cache.lock_legend(self, z)
            image = self.cache.get_legend(self, z)
            if not image:
                image = self.render_legend_image(**params)
                if image:
                    self.cache.set_legend(self, z, image)
        finally:
            self.cache.unlock_legend(self, z)
        return image
