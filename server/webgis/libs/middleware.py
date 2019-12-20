from django.utils.deprecation import MiddlewareMixin

import webgis

class WebgisHeaderMiddleware(MiddlewareMixin):
    def process_response(self, request, response):
        response['Access-Control-Expose-Headers'] = 'X-Gisquick-Version'
        response['X-Gisquick-Version'] = webgis.VERSION
        return response
