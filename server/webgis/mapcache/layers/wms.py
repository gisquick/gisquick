# BSD Licensed, Copyright (c) 2006-2008 MetaCarta, Inc.

from webgis.mapcache.layer import Layer
from webgis.mapcache import client

class WmsLayer(Layer):

    def __init__ (self, project, publish, name, provider_url, provider_image_format = None, **kwargs):
        Layer.__init__(self, project, publish, name, **kwargs)
        self.provider_url = provider_url
        self.provider_image_format = provider_image_format or self.image_format
        self.client = client.WMS(self.provider_url)

    def render_tile(self, tile):
        tile.data, response = self.client.fetch({
          "BBOX": tile.extent(),
          "WIDTH": tile.size()[0],
          "HEIGHT": tile.size()[1],
          "SRS": self.projection,
          "FORMAT": self.provider_image_format,
          "LAYERS": self.provider_layers,
          "TRANSPARENT": True
        })
        return tile.data


    def render_legend_image(self, **params):
        client_params = dict(params)
        client_params.update({
            "REQUEST": "GetLegendGraphic",
            "LAYER": self.provider_layers,
            "FORMAT": self.provider_image_format,
        })
        data, response = self.client.fetch(client_params)
        return data

# vim: set ts=4 sts=4 sw=4 noet:
