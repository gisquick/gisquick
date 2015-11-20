import webgis

class WebgisHeaderMiddleware(object):
    def process_response(self, request, response):
        response['Access-Control-Expose-Headers'] = 'X-GIS.lab-Version'
        response['X-GIS.lab-Version'] = webgis.VERSION
        return response
