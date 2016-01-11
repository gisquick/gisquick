# -*- coding: utf-8 -*-
"""
/***************************************************************************
 GIS.lab Web plugin
 Publish your projects into GIS.lab Web application
 ***************************************************************************/
"""

import os

# Import the PyQt and QGIS libraries
from qgis.core import *
from PyQt4.QtGui import *
from PyQt4.QtCore import *

from utils import opt_value
from wizard import WizardPage


class VectorLayersPage(WizardPage):

    def get_geojson_filename(self):
        timestamp = self.plugin.metadata['publish_date_unix']
        return "{0}_{1}.geojson".format(
            os.path.splitext(self.plugin.project.fileName())[0],
            timestamp
        )

    def initialize(self):
        # import vector layers configuration from lastly published
        # metadata if exists
        last_vector_config = opt_value(
            self.plugin.last_metadata,
            'vector_layers.layers',
            {}
        )
        current_vector_config = self.plugin.metadata['vector_layers']['layers']
        for layer_name, layer_config in last_vector_config.iteritems():
            if not current_vector_config.get(layer_name):
                current_vector_config[layer_name] = layer_config

    def get_vector_layers(self):
        vector_layers_names = opt_value(
            self.plugin.metadata,
            'vector_layers.layers',
            {}
        ).keys()
        return [
            layer for layer in self.plugin.layers_list()
                if layer.name() in vector_layers_names
        ]

    def on_show(self):
        vector_layers = self.get_vector_layers()
        layout = self.dialog.vectorLayers.widget().layout()
        if layout:
            for i in range(layout.count()):
                item = layout.itemAt(i)
                widget = item.widget()
                if (widget):
                    widget.deleteLater()
                else:
                    layout.removeItem(item)
        else:
            layout = QVBoxLayout()

        for layer in vector_layers:
            layer_name = layer.name()
            layer_data = self.plugin.metadata['vector_layers']['layers'].get(layer_name, {})
            row_layout = QHBoxLayout()
            row_layout.setObjectName(layer_name)
            row_layout.setContentsMargins(0, 0, 0, 0)
            title_attribute = QComboBox()
            title_attribute.setObjectName('title')
            description_attribute = QComboBox()
            description_attribute.setObjectName('description')
            title_attribute.addItem('-', '')
            description_attribute.addItem('-', '')
            fields = layer.pendingFields()
            excluded_attributes = layer.excludeAttributesWMS()
            for index in range(fields.count()):
                field = fields.field(index)
                if field.name() in excluded_attributes:
                    continue

                name = field.name()
                display = layer.attributeDisplayName(index)
                title_attribute.addItem(display, name)
                description_attribute.addItem(display, name)

                previous_title_index = title_attribute.findData(
                    layer_data.get('title_attribute')
                )
                previous_description_index = description_attribute.findData(
                    layer_data.get('description_attribute')
                )
                title_attribute.setCurrentIndex(
                    previous_title_index if previous_title_index > -1 else 0
                )
                description_attribute.setCurrentIndex(
                    previous_description_index if previous_description_index > -1 else 0
                )

            selected_only = QCheckBox()
            #checkbox_layout = QVBoxLayout()
            #checkbox_layout.setAlignment(Qt.AlignHCenter)
            #checkbox_layout.addWidget(selected_only)
            selected_only.setEnabled(layer.selectedFeatureCount() > 0)

            label = QLabel(layer_name)
            row_layout.addWidget(label)
            row_layout.addWidget(title_attribute)
            row_layout.addWidget(description_attribute)
            row_layout.addWidget(selected_only)
            #row_layout.addLayout(checkbox_layout)
            row_widget = QWidget()
            row_widget.setObjectName(layer_name)
            row_widget.setLayout(row_layout)
            layout.addWidget(row_widget)

        layout.addItem(QSpacerItem(10, 10, QSizePolicy.Minimum, QSizePolicy.Expanding))
        self.dialog.vectorLayers.widget().setLayout(layout)

    def get_metadata(self):
        vector_layers_info = {}
        vector_layers = self.get_vector_layers()
        if vector_layers:
            for layer in vector_layers:
                layer_widget = self.dialog.vectorLayers.findChild(QWidget, layer.name())
                title_combo = layer_widget.findChild(QComboBox, 'title')
                description_combo = layer_widget.findChild(QComboBox, 'description')
                vector_layers_info[layer.name()] = {
                    'title_attribute': title_combo.itemData(title_combo.currentIndex()),
                    'description_attribute': description_combo.itemData(description_combo.currentIndex())
                }
            return {
                'vector_layers': {
                    'filename': self.get_geojson_filename(),
                    'layers': vector_layers_info
                }
            }
        return {'vector_layers': None}

    def on_return(self):
        self.plugin.metadata.update(self.get_metadata())

    def validate(self):
        self.plugin.metadata.update(self.get_metadata())
        return True

    def before_publish(self):
        vector_layers = self.get_vector_layers()
        if vector_layers:
            try:
                crs_dst = map_canvas.mapSettings().destinationCrs()
            except:
                crs_dst = map_canvas.mapRenderer().destinationCrs()
            map_canvas = self.plugin.iface.mapCanvas()
            fields = QgsFields()
            fields.append(QgsField("title", type=QVariant.String))
            fields.append(QgsField("description", type=QVariant.String))
            writer = QgsVectorFileWriter(
                self.get_geojson_filename(),
                "utf-8",
                fields,
                QGis.WKBUnknown,
                crs_dst,
                "GeoJSON"
            )
            for layer in vector_layers:
                layer_metadata = self.plugin.metadata['vector_layers']['layers'][layer.name()]
                title_attribute = layer_metadata.get('title_attribute')
                description_attribute = layer_metadata.get('description_attribute')

                transform = None
                if layer.crs() != crs_dst:
                    transform = QgsCoordinateTransform(
                        layer.crs(),
                        crs_dst
                    )

                layer_widget = self.dialog.vectorLayers.findChild(QWidget, layer.name())
                selected_features_only = layer_widget.findChild(QCheckBox).isChecked()
                # QgsVectorLayer.selectedFeaturesIterator is available since version
                # 2.6, so it is better to convert QgsFeatureIterator to generator
                # and use for-loop to iterate features
                if selected_features_only:
                    features = layer.selectedFeatures()
                else:
                    def features_generator(features_iterator):
                        feature = QgsFeature()
                        while features_iterator.nextFeature(feature):
                            yield feature
                    features = features_generator(layer.getFeatures())
                for feature in features:
                    f = QgsFeature(fields)
                    f.setGeometry(feature.geometry())
                    if transform:
                        f.geometry().transform(transform)
                    f.setAttributes([
                        feature.attribute(title_attribute) if title_attribute else '',
                        feature.attribute(description_attribute) if description_attribute else ''
                    ])
                    writer.addFeature(f)
