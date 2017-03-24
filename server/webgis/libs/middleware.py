import webgis

class WebgisHeaderMiddleware(object):
    def process_response(self, request, response):
        response['Access-Control-Expose-Headers'] = 'X-Gisquick-Version'
        response['X-Gisquick-Version'] = webgis.VERSION
        return response
