from django.test import TestCase

from webgis.viewer.wfsfilter import webgisfilter, get_filter_fes
from owslib.fes import PropertyIsEqualTo, And, Or, PropertyIsLike,\
        PropertyIsLessThanOrEqualTo, PropertyIsGreaterThanOrEqualTo


class WfsFilterCase(TestCase):
    """Prepared for natural-earth/central-europe project"""

    def setUp(self):
        #self.url = 'http://localhost:90/cgi-bin/qgis_mapserv.fcgi?MAP=user/natural-earth/central-europe.qgs'
        self.url = 'https://localhost:8000/owsrequest/?MAP=user/natural-earth/central-europe.qgs'

    def test_basic(self):

        result = webgisfilter(self.url, 'Places')
        self.assertTrue(result, 'WFS Response')
        self.assertEqual(len(result['features']), 161, '161 places found')
        self.assertFalse(result['features'][0].has_key('geometry'),
                'Geometry cleared')

    def _test_paging(self):
        result = webgisfilter(self.url, 'Places', 30, 30)
        self.assertEqual(len(result['features']), 30, '30 features returned')

    def _test_bbox(self):
        bbox = [15, 50, 16, 51]
        result = webgisfilter(self.url, 'Places', bbox=bbox)
        self.assertEqual(len(result['features']), 3, '3 features returned bbox')

    def test_filer_prague(self):

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
            'operator': '>',
            'value': 10000
        }]

        fes = get_filter_fes(myfilters)
        self.assertTrue(isinstance(fes, PropertyIsGreaterThanOrEqualTo),
                "PropertyIsGreaterThanOrEqualTo")

        myfilters = [{
            'attribute': 'POP_MAX',
            'operator': '<',
            'value': 100000
        }]

        fes = get_filter_fes(myfilters)
        self.assertTrue(isinstance(fes, PropertyIsLessThanOrEqualTo),
                "PropertyIsLessThanOrEqualTo")
