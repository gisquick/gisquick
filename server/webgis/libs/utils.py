import urllib.parse
from urllib.parse import parse_qs, urlsplit, urlunsplit


def set_query_parameters(url, params_dict):
    """Given a URL, set or replace a query parameters and return the
    modified URL. Parameters are case insensitive.

    >>> set_query_parameters('http://example.com?foo=bar&biz=baz', {'foo': 'stuff'})
    'http://example.com?foo=stuff&biz=baz'

    """
    url_parts = list(urlsplit(url))
    query_params = parse_qs(url_parts[3])

    params = dict(params_dict)
    new_params_names = [name.lower() for name in params_dict.keys()]
    for name, value in query_params.items():
        if name.lower() not in new_params_names:
            params[name] = value

    url_parts[3] = urllib.parse.urlencode(params, doseq=True)
    return urlunsplit(url_parts)
