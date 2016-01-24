# -*- coding: utf-8 -*-
"""
/***************************************************************************
 GIS.lab Web plugin
 Publish your projects into GIS.lab Web application
 ***************************************************************************/
"""

import os
import json
import codecs

# Import the PyQt and QGIS libraries
from qgis.core import *
from PyQt4.QtGui import *
from PyQt4.QtCore import *

from utils import *
from wizard import WizardPage


CSS_STYLE = u"""<style type="text/css">
    body {
        background-color: #DDDDDD;
    }
    h3 {
        margin-bottom: 4px;
        margin-top: 6px;
        text-decoration: underline;
    }
    h4 {
        margin-bottom: 1px;
        margin-top: 2px;
    }
    div {
        margin-left: 10px;
    }
    ul {
        margin-top: 0px;
    }
    label {
        font-weight: bold;
    }
</style>"""


class PublishPage(WizardPage):

    def __init__(self, plugin, page):
        super(PublishPage, self).__init__(plugin, page)
        self.dialog.setButtonText(QWizard.CommitButton, "Publish")
        page.setCommitPage(True)

    def on_show(self):
        """Creates configuration summary of published project."""

        def format_template_data(data):
            iterator = data.iteritems() if type(data) == dict else enumerate(data)
            for key, value in iterator:
                if type(value) in (list, tuple):
                    if value and isinstance(value[0], Decimal):
                        value = [u'{0:.5f}'.format(v) for v in value]
                    data[key] = u', '.join(map(unicode, value))
            return data

        metadata = self.plugin.metadata
        data = {
            'DEFAULT_BASE_LAYER': self.dialog.default_baselayer.currentText(),
            'SCALES': self.plugin.resolutions_to_scales(metadata['tile_resolutions']),
            'PROJECTION': metadata['projection']['code'],
            'AUTHENTICATION': self.dialog.authentication.currentText(),
            'MESSAGE_TEXT': opt_value(metadata, 'message.text'),
            'MESSAGE_VALIDITY': opt_value(metadata, 'message.valid_until'),
            'EXPIRATION': metadata.get('expiration', ''),
        }

        for param in (
                'gislab_user',
                'gislab_unique_id',
                'gislab_version',
                'title',
                'abstract',
                'contact_person',
                'contact_mail',
                'contact_organization',
                'extent',
                'tile_resolutions',
                'units',
                'measure_ellipsoid',
                'use_mapcache'):
            data[param.upper()] = metadata[param]

        base_layers_summary = []
        def collect_base_layer_summary(layer_data):
            sublayers = layer_data.get('layers')
            if sublayers:
                base_layers_summary.append(
                    u'<h4>{0}</h4><div class="subcategory">'.format(layer_data['name'])
                )
                for sublayer_data in sublayers:
                    collect_base_layer_summary(sublayer_data)
            else:
                resolutions = layer_data['resolutions']
                if 'min_resolution' in layer_data:
                    resolutions = filter(
                        lambda res: res >= layer_data['min_resolution'] and
                            res <= layer_data['max_resolution'],
                        resolutions
                    )
                scales = self.plugin.resolutions_to_scales(resolutions)
                if 'metadata' in layer_data:
                    if 'visibility_scale_max' in layer_data:
                        scale_visibility = 'Maximum (inclusive): {0}, Minimum (exclusive): {1}'.format(
                            layer_data['visibility_scale_max'],
                            layer_data['visibility_scale_min']
                        )
                    else:
                        scale_visibility = ''
                    template_data = format_template_data([
                        layer_data['name'],
                        layer_data['extent'],
                        layer_data['projection'],
                        scale_visibility,
                        scales,
                        resolutions,
                        layer_data.get('provider_type', ''),
                        opt_value(layer_data, 'attribution.title'),
                        opt_value(layer_data, 'attribution.url'),
                        layer_data['metadata']['title'],
                        layer_data['metadata']['abstract'],
                        layer_data['metadata']['keyword_list'],
                    ])
                    layer_summary = u"""<h4>{0}</h4>
                        <ul>
                            <li><label>Extent:</label> {1}</li>
                            <li><label>CRS:</label> {2}</li>
                            <li><label>Scale based visibility:</label> {3}</li>
                            <li><label>Visible scales:</label> {4}</li>
                            <li><label>Visible resolutions:</label> {5}</li>
                            <li><label>Provider type:</label> {6}</li>
                            <li><label>Attribution:</label>
                                <ul>
                                    <li><label>Title:</label> {7}</li>
                                    <li><label>URL:</label> {8}</li>
                                </ul>
                            </li>
                            <li><label>Metadata:</label>
                                <ul>
                                    <li><label>Title:</label> {9}</li>
                                    <li><label>Abstract:</label> {10}</li>
                                    <li><label>Keyword list:</label> {11}</li>
                                </ul>
                            </li>
                        </ul>""".format(*template_data)
                # Special base layers
                else:
                    template_data = format_template_data([
                        layer_data['name'],
                        layer_data['extent'],
                        scales,
                        resolutions,
                    ])
                    layer_summary = u"""<h4>{0}</h4>
                        <ul>
                            <li><label>Extent:</label> {1}</li>
                            <li><label>Visible scales:</label> {2}</li>
                            <li><label>Visible resolutions:</label> {3}</li>"""
                    if layer_data['name'] == 'MAPBOX':
                        layer_summary += u"""
                            <li><label>MapId:</label> {4}</li>
                            <li><label>ApiKey:</label> {5}</li>"""
                        template_data.append(layer_data['mapid'])
                        template_data.append(layer_data['apikey'])
                    elif layer_data['name'].startswith('BING'):
                        layer_summary += u"""
                            <li><label>ApiKey:</label> {4}</li>"""
                        template_data.append(layer_data['apikey'])
                    layer_summary += u"""
                        </ul>"""
                    layer_summary = layer_summary.format(*template_data)
                base_layers_summary.append(layer_summary)

        for layer_data in metadata['base_layers']:
            collect_base_layer_summary(layer_data)
        data['BASE_LAYERS'] = '\n'.join(base_layers_summary)

        overlays_summary = []
        def collect_overlays_summary(layer_data):
            sublayers = layer_data.get('layers')
            if sublayers:
                overlays_summary.append(
                    u'<h4>{0}</h4><div class="subcategory">'.format(layer_data['name'])
                )
                for sublayer_data in sublayers:
                    collect_overlays_summary(sublayer_data)
                overlays_summary.append(u'</div>')
            else:
                if 'visibility_scale_max' in layer_data:
                    scale_visibility = 'Maximum (inclusive): {0}, Minimum (exclusive): {1}'.format(
                        layer_data['visibility_scale_max'],
                        layer_data['visibility_scale_min']
                    )
                else:
                    scale_visibility = ''
                template_data = format_template_data([
                    layer_data['name'],
                    layer_data['visible'],
                    layer_data['queryable'],
                    layer_data['extent'],
                    layer_data['projection'],
                    layer_data.get('geom_type', ''),
                    scale_visibility,
                    layer_data.get('labels', False),
                    layer_data['provider_type'],
                    ", ".join([
                        attribute.get('title', attribute['name'])
                        for attribute in layer_data.get('attributes', [])
                    ]),
                    opt_value(layer_data, 'attribution.title'),
                    opt_value(layer_data, 'attribution.url'),
                    layer_data['metadata']['title'],
                    layer_data['metadata']['abstract'],
                    layer_data['metadata']['keyword_list'],
                ])
                layer_summary = u"""<h4>{0}</h4>
                    <ul>
                        <li><label>Visible:</label> {1}</li>
                        <li><label>Queryable:</label> {2}</li>
                        <li><label>Extent:</label> {3}</li>
                        <li><label>CRS:</label> {4}</li>
                        <li><label>Geometry type:</label> {5}</li>
                        <li><label>Scale based visibility:</label> {6}</li>
                        <li><label>Labels:</label> {7}</li>
                        <li><label>Provider type:</label> {8}</li>
                        <li><label>Attributes:</label> {9}</li>
                        <li><label>Attribution:</label>
                            <ul>
                                <li><label>Title:</label> {10}</li>
                                <li><label>URL:</label> {11}</li>
                            </ul>
                        </li>
                        <li><label>Metadata:</label>
                            <ul>
                                <li><label>Title:</label> {12}</li>
                                <li><label>Abstract:</label> {13}</li>
                                <li><label>Keyword list:</label> {14}</li>
                            </ul>
                        </li>
                    </ul>""".format(*template_data)
                overlays_summary.append(layer_summary)

        for layer_data in metadata['overlays']:
            collect_overlays_summary(layer_data)
        data['OVERLAY_LAYERS'] = u'\n'.join(overlays_summary)

        print_composers = []
        for composer_data in metadata['composer_templates']:
            template_data = (
                composer_data['name'],
                int(round(composer_data['width'])),
                int(round(composer_data['height']))
            )
            print_composers.append(u'<li>{0} ( {1} x {2}mm )</li>'.format(*template_data))
        data['PRINT_COMPOSERS'] = u'\n'.join(print_composers)

        html = u"""<html>
            <head>{0}</head>
            <body>""".format(CSS_STYLE)
        if self.plugin.run_in_gislab:
            html += u"""
                <h3>General information:</h3>
                <ul>
                    <li><label>GIS.lab user:</label> {GISLAB_USER}</li>
                    <li><label>GIS.lab ID:</label> {GISLAB_UNIQUE_ID}</li>
                    <li><label>GIS.lab version:</label> {GISLAB_VERSION}</li>
                </ul>""".format(**format_template_data(data))
        html += u"""
                <h3>Project:</h3>
                <ul>
                    <li><label>Title:</label> {TITLE}</li>
                    <li><label>Abstract:</label> {ABSTRACT}</li>
                    <li><label>Contact person:</label> {CONTACT_PERSON}</li>
                    <li><label>Contact mail:</label> {CONTACT_MAIL}</li>
                    <li><label>Contact organization:</label> {CONTACT_ORGANIZATION}</li>
                    <li><label>Extent:</label> {EXTENT}</li>
                    <li><label>Scales:</label> {SCALES}</li>
                    <li><label>Resolutions:</label> {TILE_RESOLUTIONS}</li>
                    <li><label>Projection:</label> {PROJECTION}</li>
                    <li><label>Units:</label> {UNITS}</li>
                    <li><label>Measure ellipsoid:</label> {MEASURE_ELLIPSOID}</li>
                    <li><label>Use cache:</label> {USE_MAPCACHE}</li>
                    <li><label>Authentication:</label> {AUTHENTICATION}</li>
                    <li><label>Expiration date:</label> {EXPIRATION}</li>
                    <li><label>Message text:</label> {MESSAGE_TEXT}</li>
                    <li><label>Message validity:</label> {MESSAGE_VALIDITY}</li>
                </ul>
                <h3>Base layers:</h3>
                    <div class="subcategory">
                        <label>Default base layer:</label> {DEFAULT_BASE_LAYER}
                        {BASE_LAYERS}
                    </div>
                <h3>Overlay layers:</h3>
                    <div class="subcategory">
                    {OVERLAY_LAYERS}
                    </div>
                <h3>Print composers:</h3>
                {PRINT_COMPOSERS}
            </body>
        </html>
        """.format(**format_template_data(data))
        self.dialog.config_summary.setHtml(html)

    def publish_project(self):
        """Creates files required for publishing current project for GIS.lab Web application."""
        metadata = self.plugin.metadata
        project = self.plugin.project

        page_id = 0
        while page_id < self.dialog.currentId():
            page = self.dialog.page(page_id)
            page.handler.before_publish()
            page_id = page.nextId()

        publish_timestamp = str(metadata['publish_date_unix'])
        # create metadata file
        project_filename = os.path.splitext(project.fileName())[0]
        metadata_filename = "{0}_{1}.meta".format(project_filename, publish_timestamp)
        with open(metadata_filename, "w") as f:
            def decimal_default(obj):
                if isinstance(obj, Decimal):
                    return float(obj)
                raise TypeError
            json.dump(metadata, f, indent=2, default=decimal_default)

        # Create a copy of project's file with unique layer IDs (with publish timestamp)
        # to solve issue with duplicit layer ID when updating publish project.
        published_project_filename = "{0}_{1}.qgs".format(project_filename, publish_timestamp)
        with codecs.open(project.fileName(), 'r', 'utf-8') as fin,\
                codecs.open(published_project_filename, 'w', 'utf-8') as fout:
            project_data = fin.read()
            for layer in self.plugin.layers_list():
                project_data = project_data.replace(
                    '"{0}"'.format(layer.id()),
                    '"{0}_{1}"'.format(layer.id(), publish_timestamp)
                )
                project_data = project_data.replace(
                    '>{0}<'.format(layer.id()),
                    '>{0}_{1}<'.format(layer.id(), publish_timestamp)
                )
            fout.write(project_data)

        # If published project contains SpatiaLite layers, make sure they have filled
        # statistics info required to load layers by Mapserver. Without this procedure,
        # newly created layers in DB Manager wouldn't be loaded by Mapserver properly and
        # GetMap and GetLegendGraphics requests with such layers would cause server error.
        # The only way to update required statistics info is to create a new SpatiaLite
        # provider for every published SpatiaLite layer. (This is done automatically
        # when opening QGIS project file again).
        overlays_names = []
        def collect_overlays_names(layer_data):
            sublayers = layer_data.get('layers')
            if sublayers:
                for sublayer_data in sublayers:
                    collect_overlays_names(sublayer_data)
            else:
                overlays_names.append(layer_data['name'])

        for layer_data in metadata['overlays']:
            collect_overlays_names(layer_data)

        layers_registry = QgsMapLayerRegistry.instance()
        providers_registry = QgsProviderRegistry.instance()
        for layer_name in overlays_names:
            layer = layers_registry.mapLayersByName(layer_name)[0]
            if layer.dataProvider().name() == "spatialite":
                provider = providers_registry.provider(
                    "spatialite",
                    layer.dataProvider().dataSourceUri()
                )
                del provider

    def validate(self):
        self.publish_project()
        return True
