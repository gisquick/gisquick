from owslib.wfs import WebFeatureService
import json
import logging
from owslib.fes import PropertyIsLike, And, Or, PropertyIsEqualTo, \
    PropertyIsNotEqualTo, PropertyIsGreaterThanOrEqualTo, \
    PropertyIsGreaterThan, PropertyIsLessThan, \
    PropertyIsLessThanOrEqualTo, PropertyIsBetween, FilterRequest, BBox
from owslib.namespaces import Namespaces

from lxml import etree


def get_namespaces():
    n = Namespaces()
    ns = n.get_namespaces(["ogc"])
    ns[None] = n.get_namespace("ogc")
    return ns
namespaces = get_namespaces()

def webgisfilter(mapserv, layer, maxfeatures=None, startindex=None, bbox=None,
        filters=None):
    """webgis wfs client

    Each filter format should look like:

    {
        'attribute': ATTRIBUTE_NAME, # e.g. 'NAME'
        'operator': OPERATOR, # e.g. '='
        'value': VALUE # e.g. 'Prague'
    }

    Operators: = != ~ IN

    :param str mapserv: url to mapserver
    :param str layer: layer name
    :param int maxfeatures: number of returned features
    :param int startindex: starting feature index
    :param Tupple.<dict> filters: tupple of filters
    :return: json-encoded result
    :rtype: dict
    """

    mywfs = WebFeatureService(url=mapserv, version='1.1.0')
    fes = None
    if filters:
        if bbox:
            filters.append({ 'operator':'BBOX', 'value': bbox})
        fes = get_filter_root(get_filter_fes(filters))
        fes = etree.tostring(fes, encoding='unicode')

    if bbox and not filters:
        fes = None
    elif not bbox and filters:
        bbox = None
    elif bbox and filters:
        bbox = None

    layer_data = mywfs.getfeature(typename=[layer],
                                  filter=fes,
                                  bbox=bbox,
                                  featureid=None,
                                  outputFormat="GeoJSON",
                                  maxfeatures=maxfeatures,
                                  startindex=startindex)

    output = layer_data.read()
    if type(output) == bytes:
        output = output.decode()
    data = json.loads(output, encoding='utf8', strict=False)

    for feature in data['features']:
        feature.pop('geometry', None)

    return data

def get_filter_fes(filters, logical_operator=And):
    """Create filter encoding specification (OGC FES) object based on given
    filters

    :param Tupple.<dict> filters: tupple of filters
    :param logical_operator: owslib.fes.And or owslib.fes.Or
    :return: filter encoding specification
    :rtype: owslib.fes.AND
    """

    conditions = []
    filter_request = None

    for myfilter in filters:
        value = myfilter['value']
        if myfilter['operator'] == '=':
            conditions.append(
                    PropertyIsEqualTo(
                        myfilter['attribute'], value))
        elif myfilter['operator'] == '!=':
            conditions.append(
                    PropertyIsNotEqualTo(
                        myfilter['attribute'], value))
        elif myfilter['operator'] == '~':
            conditions.append(
                    PropertyIsLike(
                        myfilter['attribute'], value))
        elif myfilter['operator'] == '>':
            conditions.append(
                    PropertyIsGreaterThan(
                        myfilter['attribute'], value))
        elif myfilter['operator'] == '>=':
            conditions.append(
                    PropertyIsGreaterThanOrEqualTo(
                        myfilter['attribute'], value))
        elif myfilter['operator'] == '<':
            conditions.append(
                    PropertyIsLessThan(
                        myfilter['attribute'], value))
        elif myfilter['operator'] == '<=':
            conditions.append(
                    PropertyIsLessThanOrEqualTo(
                        myfilter['attribute'], value))
        elif myfilter['operator'] == 'BETWEEN':
            conditions.append(
                    PropertyIsBetween(
                        myfilter['attribute'], *value.split(',')))
        elif myfilter['operator'] == 'BBOX':
            bbox_filter = BBox(myfilter['value'], 'EPSG:3857')
            conditions.append(bbox_filter)
        elif myfilter['operator'] == 'IN':
            new_filters = [{
                'value': value,
                'operator': '=',
                'attribute': myfilter['attribute']}\
                        for value in value.split(',')]
            conditions.append(get_filter_fes(new_filters, logical_operator=Or))

    if len(conditions) > 1:
        filter_request = logical_operator(conditions)
    else:
        filter_request = conditions[0]

    return filter_request

def get_filter_root(condition):
    """Return given condition enveloped with <ogc:Filter> tag

    :param (owslib.fes.OgcExpression|owslib.fes.BinaryComparisonOpType) condition:
    """

    root = etree.Element("{{}}Filter".format(namespaces['ogc']))
    root.append(condition.toXML())
    return root
