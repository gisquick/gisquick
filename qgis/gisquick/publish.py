# -*- coding: utf-8 -*-
"""
/***************************************************************************
 Gisquick plugin
 Publish your projects into Gisquick application
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


class PublishPage(WizardPage):

    def __init__(self, plugin, page):
        super(PublishPage, self).__init__(plugin, page)
        self.dialog.setButtonText(QWizard.CommitButton, self.dialog.buttonText(QWizard.NextButton))
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
                'plugin_version',
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

        # collect base layer summary
        def collect_base_layer_summary(root, layer_data):
            sublayers = layer_data.get('layers')
            if sublayers:
                item = QTreeWidgetItem(root)
                item.setText(0, layer_data['name'])
                for sublayer_data in sublayers:
                    collect_base_layer_summary(item, sublayer_data)
            else:
                resolutions = layer_data['resolutions']
                if 'min_resolution' in layer_data:
                    resolutions = filter(
                        lambda res: res >= layer_data['min_resolution'] and
                            res <= layer_data['max_resolution'],
                        resolutions
                    )
                scales = self.plugin.resolutions_to_scales(resolutions)
                # Regular QGIS base layers
                if layer_data['type'] not in ('blank', 'osm', 'mapbox', 'bing'):
                    if 'visibility_scale_max' in layer_data:
                        scale_visibility = 'Maximum (inclusive): {0}, Minimum (exclusive): {1}'.format(
                            layer_data['visibility_scale_max'],
                            layer_data['visibility_scale_min']
                        )
                    else:
                        scale_visibility = ''

                    create_formatted_tree(root,
                                          { '{0}': [
                                              "Extent: {1}",
                                              "CRS: {2}",
                                              "Scale based visibility: {3}",
                                              "Visible scales: {4}",
                                              "Visible resolutions: {5}",
                                              "Provider type: {6}",
                                              "Attribution", ["Title: {7}", "URL: {8}"],
                                              "Metadata", ["Title: {9}", "Abstract: {10}", "Keyword list: {11}"] ]
                                          },
                                          [
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
                                              layer_data['metadata']['keyword_list']
                                          ]
                    )

                # Special base layers
                else:
                    layer_summary = [
                        "Name: {0}",
                        "Abstract: {1}",
                        "Keywords: {2}",
                        "Extent: {3}",
                        "Visible scales: {4}",
                        "Visible resolutions: {5}"
                    ]
                    if layer_data['type'] == 'mapbox':
                        layer_summary.append("MapId: {}".format(layer_data['mapid']))
                        layer_summary.append("ApiKey: {}".format(layer_data['apikey']))
                    elif layer_data['type'] == 'bing':
                        layer_summary.append("ApiKey: {}".format(layer_data['apikey']))

                    create_formatted_tree(root,
                                          { '{0}' : layer_summary },
                                          [
                                              layer_data['name'],
                                              opt_value(layer_data, 'metadata.abstract'),
                                              opt_value(layer_data, 'metadata.keyword_list'),
                                              layer_data['extent'],
                                              scales,
                                              resolutions,
                                          ]
                    )

        def collect_overlays_summary(root, layer_data):
            sublayers = layer_data.get('layers')
            if sublayers:
                item = QTreeWidgetItem(root)
                item.setText(0, layer_data['name'])
                for sublayer_data in sublayers:
                    collect_overlays_summary(item, sublayer_data)
                item.setExpanded(True)
            else:
                if 'visibility_scale_max' in layer_data:
                    scale_visibility = 'Maximum (inclusive): {0}, Minimum (exclusive): {1}'.format(
                        layer_data['visibility_scale_max'],
                        layer_data['visibility_scale_min']
                    )
                else:
                    scale_visibility = ''

                if layer_data.get('hidden'):
                    create_formatted_tree(
                        root,
                        { layer_data['name'] : "Hidden: True" }
                    )
                    return
                create_formatted_tree(root,
                                      { '{0}' : [
                                          "Visible: {1}",
                                          "Queryable: {2}",
                                          "Extent: {3}",
                                          "CRS: {4}",
                                          "Geometry type: {5}",
                                          "Scale based visibility: {6}",
                                          "Labels: {7}",
                                          "Provider type: {8}",
                                          "Attributes: {9}",
                                          "Attribution:", ["Title: {10}", "URL: {11}"],
                                          "Metadata:", ["Title: {12}", "Abstract: {13}", "Keyword list: {14}"] ]
                                      },
                                      [
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
                                          layer_data['metadata']['keyword_list']
                                      ]
                )

        # construct tree item
        tree = self.dialog.config_summary
        tree.setColumnCount(1)

        project_item = create_formatted_tree(tree.invisibleRootItem(),
                                             { "Project" : [
                                                 "Title: {TITLE}",
                                                 "Abstract: {ABSTRACT}",
                                                 "Contact person: {CONTACT_PERSON}",
                                                 "Contact mail: {CONTACT_MAIL}",
                                                 "Contact organization: {CONTACT_ORGANIZATION}",
                                                 "Extent: {EXTENT}",
                                                 "Scales: {SCALES}",
                                                 "Resolutions: {TILE_RESOLUTIONS}",
                                                 "Projection: {PROJECTION}",
                                                 "Units: {UNITS}",
                                                 "Measure ellipsoid: {MEASURE_ELLIPSOID}",
                                                 "Use cache: {USE_MAPCACHE}",
                                                 "Authentication: {AUTHENTICATION}",
                                                 "Expiration date: {EXPIRATION}",
                                                 "Message text: {MESSAGE_TEXT}",
                                                 "Message validity: {MESSAGE_VALIDITY}" ]
                                             },
                                             data
        )

        item = create_formatted_tree(tree.invisibleRootItem(),
                                     "Base layers (default: {DEFAULT_BASE_LAYER})",
                                     data)
        for layer_data in metadata['base_layers']:
            collect_base_layer_summary(item, layer_data)
        item.setExpanded(True)

        item = create_formatted_tree(tree.invisibleRootItem(),
                                     "Overlay layers")
        for layer_data in metadata['overlays']:
            collect_overlays_summary(item, layer_data)
        item.setExpanded(True)

        print_composers = []
        for composer_data in metadata['composer_templates']:
            print_composers.append('{0} ( {1} x {2}mm )'.format(
                composer_data['name'],
                int(round(composer_data['width'])),
                int(round(composer_data['height']))
                )
            )

        create_formatted_tree(tree.invisibleRootItem(),
                              { "Print composers" : print_composers }
        ).setExpanded(True)

    def publish_project(self):
        """Creates files required for publishing current project for Gisquick application."""
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
                    u'"{0}"'.format(layer.id()),
                    u'"{0}_{1}"'.format(layer.id(), publish_timestamp)
                )
                project_data = project_data.replace(
                    u'>{0}<'.format(layer.id()),
                    u'>{0}_{1}<'.format(layer.id(), publish_timestamp)
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

        map_layers = QgsMapLayerRegistry.instance().mapLayers()
        providers_registry = QgsProviderRegistry.instance()
        for layer_name in overlays_names:
            layer = filter(
              lambda l: layer_name in (l.name(), l.shortName()),
              map_layers.values()
            )[0]
            if layer.dataProvider().name() == "spatialite":
                provider = providers_registry.provider(
                    "spatialite",
                    layer.dataProvider().dataSourceUri()
                )
                del provider

    def validate(self):
        self.publish_project()
        return True
