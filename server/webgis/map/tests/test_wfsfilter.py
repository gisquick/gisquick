import json
import urllib.request

from django.test import TestCase
from owslib.fes import PropertyIsEqualTo, And, Or, PropertyIsLike,\
        PropertyIsLessThanOrEqualTo, PropertyIsGreaterThanOrEqualTo

from webgis.libs.utils import set_query_parameters
from webgis.map.wfsfilter import webgisfilter, get_filter_fes


class WfsFilterCase(TestCase):
    """Prepared for natural-earth/central-europe project"""

    def setUp(self):
        self.url = 'http://localhost:90/cgi-bin/qgis_mapserv.fcgi?MAP=vagrant/natural-earth/central-europe.qgs'

    def test_basic(self):

        result = webgisfilter(self.url, 'Places')
        self.assertTrue(result, 'WFS Response')
        self.assertEqual(len(result['features']), 161, '161 places found')
        self.assertFalse('geometry' in result['features'][0], 'Geometry cleared')

    def _test_paging(self):
        result = webgisfilter(self.url, 'Places', 30, 30)
        self.assertEqual(len(result['features']), 30, '30 features returned')

    def _test_bbox(self):
        bbox = [15, 50, 16, 51]
        result = webgisfilter(self.url, 'Places', bbox=bbox)
        self.assertEqual(len(result['features']), 3, '3 features returned bbox')

    def test_filter_prague(self):

        prague_filter = [
        {
            'attribute': 'NAME',
            'operator': '~',
            'value': 'Prague'
        }
        ]

        result = webgisfilter(self.url, 'Places', filters=prague_filter)

        self.assertEqual(len(result['features']), 1, "Prague found")

    def test_filter_equal(self):

        myfilters = [
        {
            'attribute': 'NAME',
            'operator': '=',
            'value': 'Prague'
        }
        ]
        fes = get_filter_fes(myfilters)

        self.assertTrue(isinstance(fes, PropertyIsEqualTo), "PropertyIsEqualTo")

        result = webgisfilter(self.url, 'Places', filters=myfilters)
        self.assertEqual(len(result['features']), 1, "Prague found")

    def test_filter_max_features(self):
        myfilters = [{
            'attribute': 'POP_MAX',
            'operator': '>=',
            'value': '100'
        }]
        result = webgisfilter(
            self.url, 'Places',
            maxfeatures=50, filters=myfilters
        )
        self.assertEqual(len(result['features']), 50,
            "161 places found with population bigger then 100")

        last_feature = result['features'][-1]

        result = webgisfilter(
            self.url, 'Places',
            maxfeatures=50, startindex=49, filters=myfilters
        )

        self.assertEqual(len(result['features']), 50,
            "161 places found with population bigger then 100")

        first_feature = result['features'][0]

        self.assertEqual(first_feature['id'], last_feature['id'])


    def test_two_filters(self):
        myfilters = [
        {
            'attribute': 'NAME',
            'operator': '=',
            'value': 'Prague'
        },
        {
            'attribute': 'NAME',
            'operator': '=',
            'value': 'Berlin'
        }]

        fes = get_filter_fes(myfilters)
        self.assertTrue(isinstance(fes, And), "And")


    def test_filter_in(self):
        myfilters = [{
            'attribute': 'NAME',
            'operator': 'IN',
            'value': 'Berlin,Prague'
        }]

        fes = get_filter_fes(myfilters)
        self.assertTrue(isinstance(fes, Or), "Or")

    def test_filter_greater_lesser(self):
        myfilters = [{
            'attribute': 'POP_MAX',
            'operator': '>=',
            'value': 10000
        }]

        fes = get_filter_fes(myfilters)
        self.assertTrue(isinstance(fes, PropertyIsGreaterThanOrEqualTo),
                "PropertyIsGreaterThanOrEqualTo")

        myfilters = [{
            'attribute': 'POP_MAX',
            'operator': '<=',
            'value': 100000
        }]

        fes = get_filter_fes(myfilters)
        self.assertTrue(isinstance(fes, PropertyIsLessThanOrEqualTo),
                "PropertyIsLessThanOrEqualTo")

    def _test_geometry_filter(self):
        # test is not finished yet and now it's crashing due to bug in QGIS server
        geometry = (
          '<Polygon>'
            '<exterior>'
              '<LinearRing>'
                '<posList>'
                  '1881392.6859162913 6873826.01525614 '
                  '1881342.6859162913 6873912.61779651 '
                  '1881242.6859162913 6873912.61779651 '
                  '1881192.6859162913 6873826.01525614 '
                  '1881242.6859162913 6873739.41271576 '
                  '1881342.6859162913 6873739.41271576 '
                  '1881392.6859162913 6873826.01525614'
                '</posList>'
              '</LinearRing>'
            '</exterior>'
          '</Polygon>'
        )
        spatial_filter = (
          '<Filter>'
            '<ogc:Intersects>'
              '<ogc:PropertyName>geometry</ogc:PropertyName>'
              '{0}'
            '</ogc:Intersects>'
          '</Filter>'
        ).format(geometry)

        url = set_query_parameters(
            self.url,
            {
                'SERVICE': 'WFS',
                'VERSION': '1.0.0',
                'REQUEST': 'GetFeature',
                'TYPENAME': 'Places,Roads,Other',
                'OUTPUTFORMAT': 'GeoJSON',
                'FILTER': spatial_filter
            }
        )

        response = urllib.request.urlopen(url).read()
        data = json.loads(response)
        features = data['features']
        self.assertEqual(len(features), 2)
