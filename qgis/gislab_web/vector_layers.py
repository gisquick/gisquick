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

from wizard import WizardPage


class VectorLayersPage(WizardPage):

    def get_geojson_filename(self):
        timestamp = self.plugin.metadata['publish_date_unix']
        return "{0}_{1}.geojson".format(
            os.path.splitext(self.plugin.project.fileName())[0],
            timestamp
        )

    def get_vector_layers(self, node=None):
        if node is None:
            node = self.plugin.get_project_layers()
        layers = []
        for child in node.children:
            layers.extend(self.get_vector_layers(child))
        if node.layer:
            layer = node.layer
            layers_model = self.dialog.treeView.model()
            layer_widget = layers_model.findItems(
                layer.name(),
                Qt.MatchExactly | Qt.MatchRecursive
            )[0]
            if layer_widget.checkState() == Qt.Checked and \
                    layers_model.columnItem(layer_widget, 1).checkState() == Qt.Checked:
                layers.append(layer)
        return layers

    def initialize(self, metadata=None):
        vector_layers = [
            layer for layer in self.plugin.iface.legendInterface().layers()
                if layer.type() == QgsMapLayer.VectorLayer
        ]
        last_config_layers = metadata.get('vector_layers', {}).get('layers', {}) if metadata else {}
        layout = QVBoxLayout()
        for layer in vector_layers:
            layer_name = layer.name()
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

            if layer_name in last_config_layers:
                previous_title_index = title_attribute.findData(
                    last_config_layers[layer_name]['title_attribute']
                )
                previous_description_index = description_attribute.findData(
                    last_config_layers[layer_name]['description_attribute']
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

    def show(self):
        all_vector_layers = [
            layer for layer in self.plugin.iface.legendInterface().layers()
                if layer.type() == QgsMapLayer.VectorLayer
        ]
        exported_vector_layers = self.get_vector_layers()
        for layer in all_vector_layers:
            layer_widget = self.dialog.vectorLayers.findChild(QWidget, layer.name())
            is_geojson_layer = layer in exported_vector_layers
            layer_widget.setVisible(is_geojson_layer)
            if is_geojson_layer and layer.selectedFeatureCount() == 0:
                layer_widget.findChild(QCheckBox).setEnabled(False)

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

    def before_publish(self):
        vector_layers = self.get_vector_layers()
        if vector_layers:
            map_canvas = self.plugin.iface.mapCanvas()
            fields = QgsFields()
            fields.append(QgsField("title", type=QVariant.String))
            fields.append(QgsField("description", type=QVariant.String))
            writer = QgsVectorFileWriter(
                self.get_geojson_filename(),
                "utf-8",
                fields,
                QGis.WKBUnknown,
                map_canvas.mapRenderer().destinationCrs(),
                "GeoJSON"
            )
            for layer in vector_layers:
                layer_widget = self.dialog.vectorLayers.findChild(QWidget, layer.name())
                title_combo = layer_widget.findChild(QComboBox, 'title')
                description_combo = layer_widget.findChild(QComboBox, 'description')
                title_attribute = title_combo.itemData(title_combo.currentIndex())
                description_attribute = description_combo.itemData(description_combo.currentIndex())
                selected_features_only = layer_widget.findChild(QCheckBox).isChecked()

                transform = None
                if layer.crs() != map_canvas.mapRenderer().destinationCrs():
                    transform = QgsCoordinateTransform(
                        layer.crs(),
                        map_canvas.mapRenderer().destinationCrs()
                    )
                # QgsVectorLayer.selectedFeaturesIterator is available since 2.6 version,
                #  so it is better to convert QgsFeatureIterator to generator and use
                # for-loop to iterate features
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
