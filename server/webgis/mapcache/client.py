# BSD Licensed, Copyright (c) 2006-2008 MetaCarta, Inc.

import urllib
import urllib2
import httplib


class WMS (object):
    fields = ("BBOX", "SRS", "WIDTH", "HEIGHT", "FORMAT", "LAYERS", "STYLES")
    default_params = {'VERSION': '1.1.1', 'REQUEST': 'GetMap', 'SERVICE': 'WMS'}
    __slots__ = ("base_url", "params", "client", "data", "response", "base_url_params")

    def __init__ (self, base):
        base = urllib.unquote_plus(base)
        if base[-1] not in "?&":
            if "?" in base:
                base += "&"
            else:
                base += "?"

        self.client = urllib2.build_opener()

        self.base_url, querystring = base.split("?")
        self.base_url_params = dict([get_param.split("=") for get_param in querystring.split("&") if get_param])

    def fetch (self, params):
        request_params = dict(self.default_params)
        request_params.update(params)
        request_params.update(self.base_url_params)

        # request_params = dict(self.default_params)
        # request_params.update(self.base_url_params)
        # request_params.update(params)
        urlrequest = urllib2.Request(self.base_url + "?" + urllib.urlencode(request_params))
        urlrequest.add_header("User-Agent", "GIS.lab Web")
        response = None
        while response is None:
            try:
                response = self.client.open(urlrequest)
                print urlrequest.get_full_url()
                data = response.read()
                # check to make sure that we have an image...
                msg = response.info()
                if msg.has_key("Content-Type"):
                    ctype = msg['Content-Type']
                    if ctype[:5].lower() != 'image':
                        raise Exception("Did not get image from rendering provider.\nURL: %s\nContent-Type Header: %s\nResponse: \n%s"
                            % (urlrequest.get_full_url(), ctype, data))
            except httplib.BadStatusLine:
                response = None # try again
            finally:
                if response:
                    response.close()
        return data, response

    def set_extent (self, extent):
        self.params["bbox"] = ",".join(map(str, extent))

