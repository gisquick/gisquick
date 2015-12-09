# -*- coding: utf-8 -*-
"""
/***************************************************************************
 GIS.lab Web plugin
 Publish your projects into GIS.lab Web application
 ***************************************************************************/
"""

import os
import re
import time
import types
import datetime
from decimal import Decimal
from urlparse import parse_qs

# Import the PyQt and QGIS libraries
from qgis.core import *
from PyQt4.QtGui import *
from PyQt4.QtCore import *
from PyQt4.QtXml import QDomDocument

from utils import to_decimal_array, opt_value
from wizard import WizardPage


AUTHENTICATION_OPTIONS = (
    'all',
    'authenticated',
    'owner'
)

DEFAULT_PROJECT_SCALES = (
        10000000,
        5000000,
        2500000,
        1000000,
        500000,
        250000,
        100000,
        50000,
        25000,
        10000,
        5000,
        2500,
        1000,
        500
)

osm_resolutions = to_decimal_array(
    """156543.03390625,78271.516953125,39135.7584765625,19567.87923828125,9783.939619140625,
    4891.9698095703125,2445.9849047851562,1222.9924523925781,611.4962261962891,305.74811309814453,
    152.87405654907226,76.43702827453613,38.218514137268066,19.109257068634033,9.554628534317017,
    4.777314267158508,2.388657133579254,1.194328566789627,0.5971642833948135"""
)
OSM_LAYER = {
    'name': 'OSM',
    'type': 'OSM',
    'title': 'Open Street Map',
    'resolutions': osm_resolutions,
    'extent': [-16319611.284727, -5615981.3413867, 16319611.284727, 5615981.3413867]
}

google_resolutions = to_decimal_array(
    """156543.03390625,78271.516953125,39135.7584765625,19567.87923828125,
    9783.939619140625,4891.9698095703125,2445.9849047851562,1222.9924523925781,
    611.4962261962891,305.74811309814453,152.87405654907226,76.43702827453613,
    38.218514137268066,19.109257068634033,9.554628534317017,4.777314267158508"""
)
google_extent = [-16319611.284727, -5615981.3413867, 16319611.284727, 5615981.3413867]
GOOGLE_LAYERS = (
    {
        'name': 'GROADMAP',
        'type': 'google',
        'title': 'Google Roadmap',
        'resolutions': google_resolutions,
        'extent': google_extent
    },
    {
        'name': 'GHYBRID',
        'type': 'google',
        'title': 'Google Hybrid',
        'resolutions': google_resolutions,
        'extent': google_extent
    },
    {
        'name': 'GSATELLITE',
        'type': 'google',
        'title': 'Google Satellite',
        'resolutions': google_resolutions,
        'extent': google_extent
    },
    {
        'name': 'GTERRAIN',
        'type': 'google',
        'title': 'Google Terrain',
        'resolutions': google_resolutions,
        'extent': google_extent
    },
)

MSG_ERROR = "Error"
MSG_WARNING = "Warning"


class ProjectPage(WizardPage):

    def _show_messages(self, messages):
        """Display messages in dialog window."""
        dialog = self.dialog
        table = dialog.info_table
        if messages:
            dialog.errors_group.setVisible(True)
            rowCount = len(messages)
            table.setRowCount(rowCount)
            red = QColor.fromRgb(255, 0, 0)
            orange = QColor("#FF7F2A")
            for row_index, message in enumerate(messages):
                msg_type, msg_text = message
                item = QTableWidgetItem(msg_type)
                item.setForeground(red if msg_type == MSG_ERROR else orange)
                dialog.info_table.setItem(row_index, 0, item)
                dialog.info_table.setItem(row_index, 1, QTableWidgetItem(msg_text))
        else:
            dialog.errors_group.setVisible(False)

    def is_config_valid(self):
        """Checks whether all conditions for publishing project is satisfied,
        generating all warnings/errors displayed to user."""
        messages = []
        if self.plugin.project.isDirty():
            messages.append((
                MSG_ERROR,
                u"Project has been modified. Save it before continue (Project > Save)."
            ))

        if not self.dialog.project_title.text():
            messages.append((
                MSG_ERROR,
                u"Project title is required. Enter project title in 'Project' tab."
            ))

        crs_transformation, ok = self.plugin.project.readBoolEntry(
            "SpatialRefSys",
            "/ProjectionsEnabled"
        )
        if not ok or not crs_transformation:
            messages.append((
                MSG_WARNING,
                u"'On the fly' CRS transformation is disabled. Enable it when using " \
                "layers with different CRSs ('Project > Project Properties > CRS')."
            ))

        map_canvas = self.plugin.iface.mapCanvas()
        if map_canvas.mapRenderer().destinationCrs().authid().startswith('USER:'):
            messages.append((
                MSG_ERROR,
                u"Project is using custom coordinate system which is currently not supported."
            ))

        all_layers = [layer.name() for layer in self.plugin.layers_list()]
        if len(all_layers) != len(set(all_layers)):
            messages.append((
                MSG_ERROR,
                u"Project contains layers with the same names."
            ))

        min_resolution = self.dialog.min_scale.itemData(self.dialog.min_scale.currentIndex())
        max_resolution = self.dialog.max_scale.itemData(self.dialog.max_scale.currentIndex())
        def publish_resolutions(resolutions, min_resolution=min_resolution, max_resolution=max_resolution):
            return filter(
                lambda res: res >= min_resolution and res <= max_resolution,
                resolutions
            )

        base_layers = [
            layer for layer in self.plugin.layers_list()
                if self.plugin.is_base_layer_for_publish(layer)
        ]
        for layer in base_layers:
            if layer.crs().authid().startswith('USER:'):
                messages.append((
                    MSG_ERROR,
                    u"Base layer '{0}' is using custom coordinate system " \
                    "which is currently not supported.".format(layer.name())
                ))
            resolutions = self.plugin.wmsc_layer_resolutions(layer)
            if resolutions is not None and not publish_resolutions(resolutions):
                messages.append((
                    MSG_WARNING,
                    u"Base layer '{0}' will not be visible in published " \
                    "project scales".format(layer.name())
                ))

        file_datasources = set()
        dbname_pattern = re.compile("dbname='([^']+)'")
        if self.dialog.treeView.model():
            overlay_layers = [
                layer for layer in self.plugin.layers_list()
                    if self.plugin.is_overlay_layer_for_publish(layer)
            ]
            for layer in overlay_layers:
                layer_widget = self.dialog.treeView.model().findItems(
                    layer.name(),
                    Qt.MatchExactly | Qt.MatchRecursive
                )
                if layer_widget:
                    layer_widget = layer_widget[0]
                    if layer_widget.checkState() == Qt.Checked:
                        # try to parse filename from layer's source string
                        # (SpatiaLite vector layer)
                        match = dbname_pattern.search(layer.source())
                        if match:
                            dbname = match.group(1)
                            if os.path.exists(dbname):
                                file_datasources.add(dbname)
                        else:
                            # try layer's source string without parsing
                            # (image raster layer)
                            if os.path.exists(layer.source()):
                                file_datasources.add(layer.source())
                        if layer.crs().authid().startswith('USER:'):
                            messages.append((
                                MSG_ERROR,
                                u"Overlay layer '{0}' is using custom coordinate system " \
                                "which is currently not supported.".format(layer.name())
                            ))
        project_dir = os.path.dirname(self.plugin.project.fileName())+os.path.sep
        for file_datasource in file_datasources:
            if not file_datasource.startswith(project_dir):
                messages.append((
                    MSG_ERROR,
                    u"Project data file '{0}' is located outside of the" \
                    "QGIS project directory. ".format(file_datasource)
                ))

        self._show_messages(messages)
        for msg_type, msg_text in messages:
            if msg_type == MSG_ERROR:
                return False
        return True

    def validate(self):
        if self.is_config_valid():
            self.plugin.metadata.update(
                self.get_metadata()
            )
            return True
        return False

    def setup_config_page_from_metadata(self, metadata):
        dialog = self.dialog
        title = metadata.get('title')
        if title:
            dialog.project_title.setText(title)
        message = metadata.get('message')
        if message:
            dialog.message_text.insertPlainText(message.get('text', ''))
            valid_until = message.get('valid_until')
            dialog.message_valid_until.setDate(
                datetime.datetime.strptime(valid_until, "%d.%m.%Y")
            )
        expiration = metadata.get('expiration')
        if expiration:
            dialog.enable_expiration.setChecked(True)
            dialog.expiration.setDate(
                datetime.datetime.strptime(expiration, "%d.%m.%Y")
            )

        authentication = metadata.get('authentication')
        if authentication:
            # backward compatibility
            if type(authentication) is dict:
                if authentication.get('allow_anonymous') and \
                        not authentication.get('require_superuser'):
                    dialog.authentication.setCurrentIndex(0)
                if not authentication.get('allow_anonymous'):
                    dialog.authentication.setCurrentIndex(1)
            else:
                auth_index = AUTHENTICATION_OPTIONS.index(authentication) \
                             if authentication in AUTHENTICATION_OPTIONS else 1
                dialog.authentication.setCurrentIndex(auth_index)
        project_extent = list(metadata['extent'])
        extent_buffer = metadata.get('extent_buffer', 0)
        if extent_buffer != 0:
            project_extent = [
                project_extent[0]+extent_buffer,
                project_extent[1]+extent_buffer,
                project_extent[2]-extent_buffer,
                project_extent[3]-extent_buffer
            ]
        extent_index = dialog.extent_layer.findData(project_extent)
        if extent_index < 0:
            extent_index = 0
        dialog.extent_layer.setCurrentIndex(extent_index)
        dialog.use_mapcache.setChecked(metadata.get('use_mapcache') is True)
        dialog.extent_buffer.setValue(extent_buffer)
        # create list of all layers from layers metadata tree structure
        def extract_layers(layers_data, layers=None):
            if layers is None:
                layers = []
            for layer_data in layers_data:
                if 'layers' in layer_data:
                    extract_layers(layer_data['layers'], layers)
                else:
                    layers.append(layer_data)
            return layers

        if metadata.get('base_layers'):
            for base_layer in extract_layers(metadata['base_layers']):
                if base_layer['type'] == 'BLANK':
                    dialog.blank.setChecked(True)
                elif base_layer['type'] == 'OSM':
                    dialog.osm.setChecked(True)
                elif base_layer['type'] == 'google':
                    for index, glayer in enumerate(GOOGLE_LAYERS, 1):
                        if glayer['name'] == base_layer['name']:
                            dialog.google.setCurrentIndex(index);
                            break
                if base_layer['visible']:
                    dialog.default_baselayer.setCurrentIndex(
                        dialog.default_baselayer.findData(base_layer['name'])
                    )

        overlays_data = extract_layers(metadata['overlays'])
        geojson_overlays = opt_value(metadata, 'vector_layers.layers', {}).keys()
        project_overlays = [layer_data['name'] for layer_data in overlays_data]
        project_overlays.extend(geojson_overlays)
        hidden_overlays = [
            layer_data['name'] for layer_data in overlays_data
                if layer_data.get('hidden')
        ]
        overlays_with_export_to_drawings = [
            layer_data['name'] for layer_data in overlays_data
                if layer_data.get('export_to_drawings')
        ]
        def load_layers_settings(group_item):
            for index in range(group_item.rowCount()):
                child_item = group_item.child(index)
                if child_item.data(Qt.UserRole):
                    layer_name = child_item.text()
                    child_item.setCheckState(
                        Qt.Checked if layer_name in project_overlays else Qt.Unchecked
                    )
                    layers_model = child_item.model()
                    vector_item = layers_model.columnItem(child_item, 1)
                    export_item = layers_model.columnItem(child_item, 2)
                    if vector_item.isCheckable():
                        vector_item.setCheckState(
                            Qt.Checked if layer_name in geojson_overlays else Qt.Unchecked
                        )
                    if export_item.isCheckable():
                        export_item.setCheckState(
                            Qt.Checked if layer_name in overlays_with_export_to_drawings else \
                            Qt.Unchecked
                        )
                    layers_model.columnItem(child_item, 3).setCheckState(
                        Qt.Checked if layer_name in hidden_overlays else Qt.Unchecked
                    )
                else:
                    load_layers_settings(child_item)
        load_layers_settings(dialog.treeView.model().invisibleRootItem())

        max_res = metadata['tile_resolutions'][0]
        min_res = metadata['tile_resolutions'][-1]
        min_scale, max_scale = self.plugin.resolutions_to_scales(
            to_decimal_array([min_res, max_res])
        )
        min_scale_index = dialog.min_scale.findText("1:{0}".format(min_scale))
        max_scale_index = dialog.max_scale.findText("1:{0}".format(max_scale))
        dialog.min_scale.setCurrentIndex(
            min_scale_index if min_scale_index != -1 else dialog.min_scale.count() - 1
        )
        dialog.max_scale.setCurrentIndex(
            max_scale_index if min_scale_index != -1 else 0
        )


    def _update_min_max_scales(self, resolutions):
        """Updates available scales in Minimum/Maximum scale fields based on given resolutions."""
        dialog = self.dialog
        if not resolutions:
            resolutions = self.plugin.scales_to_resolutions(DEFAULT_PROJECT_SCALES)
        resolutions = sorted(resolutions, reverse=True)
        scales = self.plugin.resolutions_to_scales(resolutions)
        index = dialog.min_scale.currentIndex()
        old_min_resolution = dialog.min_scale.itemData(index) if index != -1 else None
        index = dialog.max_scale.currentIndex()
        old_max_resolution = dialog.max_scale.itemData(index) if index != -1 else None

        dialog.min_scale.clear()
        dialog.max_scale.clear()
        for scale, resolution in zip(scales, resolutions):
            dialog.min_scale.addItem('1:{0}'.format(scale), Decimal(resolution))
            dialog.max_scale.addItem('1:{0}'.format(scale), Decimal(resolution))
        if old_min_resolution:
            for index, res in enumerate(resolutions):
                if res <= old_min_resolution:
                    break
            dialog.min_scale.setCurrentIndex(index)
        else:
            dialog.min_scale.setCurrentIndex(len(scales)-1)

        if old_max_resolution:
            for index, res in enumerate(reversed(resolutions)):
                if res >= old_max_resolution:
                    break
            index = len(resolutions)-1-index
            dialog.max_scale.setCurrentIndex(index)
        else:
            dialog.max_scale.setCurrentIndex(0)

    def initialize(self):
        dialog = self.dialog
        dialog.tabWidget.setCurrentIndex(0)
        title = self.plugin.project.title() or self.plugin.project.readEntry("WMSServiceTitle", "/")[0]
        dialog.project_title.setText(title)

        map_canvas = self.plugin.iface.mapCanvas()
        self.base_layers_tree = self.plugin.get_project_base_layers()
        self.overlay_layers_tree = self.plugin.get_project_layers()

        def expiration_toggled(checked):
            dialog.expiration.setEnabled(checked)
        dialog.enable_expiration.toggled.connect(expiration_toggled)
        dialog.expiration.setDate(datetime.date.today() + datetime.timedelta(days=1))

        resolutions = self.plugin.project_layers_resolutions()
        self._update_min_max_scales(resolutions)

        def blank_toggled(checked):
            if checked:
                dialog.default_baselayer.insertItem(0, 'Blank', 'BLANK')
            else:
                dialog.default_baselayer.removeItem(0)

        def osm_toggled(checked, project_resolutions=resolutions):
            resolutions = set(project_resolutions)
            position = 1 if dialog.blank.isChecked() else 0
            if checked:
                dialog.default_baselayer.insertItem(position, OSM_LAYER['title'], OSM_LAYER['name'])
                resolutions.update(OSM_LAYER['resolutions'])
            else:
                dialog.default_baselayer.removeItem(position)

            if dialog.google.currentIndex() > 0:
                resolutions.update(GOOGLE_LAYERS[0]['resolutions'])
            self._update_min_max_scales(resolutions)

        def google_layer_changed(index, project_resolutions=resolutions):
            resolutions = set(project_resolutions)
            position = 1 if dialog.blank.isChecked() else 0
            if dialog.osm.isChecked():
                position += 1
                resolutions.update(OSM_LAYER['resolutions'])

            google_layers = [dialog.google.itemText(i) for i in range(1, 5)]
            contains_google_layer = dialog.default_baselayer.itemText(position) in google_layers
            if index > 0:
                google_layer = GOOGLE_LAYERS[index-1]
                if contains_google_layer:
                    dialog.default_baselayer.setItemText(position, dialog.google.currentText())
                    dialog.default_baselayer.setItemData(position, google_layer['name'])
                else:
                    dialog.default_baselayer.insertItem(
                        position,
                        dialog.google.currentText(),
                        google_layer['name']
                    )
                resolutions.update(google_layer['resolutions'])
            elif contains_google_layer:
                dialog.default_baselayer.removeItem(position)
            self._update_min_max_scales(resolutions)

        dialog.blank.toggled.connect(blank_toggled)
        dialog.osm.toggled.connect(osm_toggled)
        dialog.google.currentIndexChanged.connect(google_layer_changed)

        def scales_changed(index):
            self.is_config_valid()
        dialog.min_scale.currentIndexChanged.connect(scales_changed)
        dialog.max_scale.currentIndexChanged.connect(scales_changed)

        projection = map_canvas.mapRenderer().destinationCrs().authid()
        dialog.osm.setEnabled(projection == 'EPSG:3857')
        dialog.google.setEnabled(projection == 'EPSG:3857')

        dialog.extent_layer.addItem(
            "All layers",
            list(map_canvas.fullExtent().toRectF().getCoords())
        )
        for layer in self.plugin.layers_list():
            if self.plugin.is_base_layer_for_publish(layer):
                dialog.default_baselayer.addItem(layer.name(), layer.name())
            if self.plugin.is_base_layer_for_publish(layer) or \
                    self.plugin.is_overlay_layer_for_publish(layer):
                extent = list(
                    map_canvas.mapRenderer().layerExtentToOutputExtent(
                        layer,
                        layer.extent()
                    ).toRectF().getCoords()
                )
                dialog.extent_layer.addItem(layer.name(), extent)

        dialog.message_valid_until.setDate(datetime.date.today() + datetime.timedelta(days=1))

        def create_layer_widget(node):
            sublayers_widgets = []
            for child in node.children:
                sublayer_widget = create_layer_widget(child)
                if sublayer_widget:
                    sublayers_widgets.append(sublayer_widget)
            if sublayers_widgets:
                group_item = QStandardItem(node.name)
                for child in sublayers_widgets:
                    group_item.appendRow(child)
                return group_item
            elif node.layer:
                layer = node.layer
                is_vector_layer = layer.type() == QgsMapLayer.VectorLayer
                layer_item = QStandardItem(layer.name())
                layer_item.setFlags(
                      Qt.ItemIsEnabled
                    | Qt.ItemIsSelectable
                    | Qt.ItemIsUserCheckable
                    | Qt.ItemIsTristate
                )
                layer_item.setData(layer, Qt.UserRole)
                layer_item.setCheckState(Qt.Checked)
                hidden = QStandardItem()
                vector = QStandardItem()
                hidden.setFlags(
                      Qt.ItemIsEnabled
                    | Qt.ItemIsSelectable
                    | Qt.ItemIsUserCheckable
                    | Qt.ItemIsTristate
                )
                hidden.setCheckState(Qt.Unchecked)
                export = QStandardItem()
                if is_vector_layer:
                    export.setFlags(
                          Qt.ItemIsEnabled
                        | Qt.ItemIsSelectable
                        | Qt.ItemIsUserCheckable
                        | Qt.ItemIsTristate
                    )
                    export.setCheckState(Qt.Checked)
                    vector.setFlags(
                          Qt.ItemIsEnabled
                        | Qt.ItemIsSelectable
                        | Qt.ItemIsUserCheckable
                        | Qt.ItemIsTristate
                    )
                    vector.setCheckState(Qt.Unchecked)
                else:
                    export.setFlags(Qt.ItemIsSelectable)
                    vector.setFlags(Qt.ItemIsSelectable)
                return [layer_item, vector, export, hidden]

        if self.overlay_layers_tree:
            layers_model = QStandardItemModel()
            def columnItem(self, item, column):
                """"Returns item from layers tree at the same row as given
                item (of any column) and given column index."""
                row = item.row()
                if item.parent():
                    return item.parent().child(row, column)
                else:
                    return self.item(row, column)
            layers_model.columnItem = types.MethodType(columnItem, layers_model)
            layers_model.setHorizontalHeaderLabels(
                ['Layer', 'Vector', 'Allow drawing', 'Hidden']
            )
            dialog.treeView.setModel(layers_model)
            layers_root = create_layer_widget(self.overlay_layers_tree)
            while layers_root.rowCount():
                layers_model.appendRow(layers_root.takeRow(0))
            dialog.treeView.header().setResizeMode(0, QHeaderView.Stretch)
            dialog.treeView.header().setVisible(True)

            def layer_item_changed(item):
                if item.model().columnItem(item, 0).data(Qt.UserRole): # check if item is layer item
                    dependent_items = None
                    if item.column() == 0:
                        enabled = item.checkState() == Qt.Checked
                        for index in (1, 2, 3):
                            item.model().columnItem(item, index).setEnabled(enabled)
                    # Enable/disable checkboxes of 'Allow drawing' and 'Hidden'
                    # columns when 'Vector' column change state
                    elif item.column() == 1 and item.isEnabled():
                        item.model().columnItem(item, 2).setEnabled(item.checkState() == Qt.Unchecked)
                        item.model().columnItem(item, 3).setEnabled(item.checkState() == Qt.Unchecked)
                    # Enable/disable checkboxes of 'Allow drawing' and 'Vector' columns
                    # when 'Hidden' column change state
                    elif item.column() == 3 and item.isEnabled():
                        item.model().columnItem(item, 1).setEnabled(item.checkState() == Qt.Unchecked)
                        item.model().columnItem(item, 2).setEnabled(item.checkState() == Qt.Unchecked)

            layers_model.itemChanged.connect(layer_item_changed)

        if self.plugin.last_metadata:
            try:
                self.setup_config_page_from_metadata(self.plugin.last_metadata)
            except:
                QMessageBox.warning(
                    None,
                    'Warning',
                    'Failed to load settings from last published version'
                )
        self.is_config_valid()

    def get_vector_layers(self):
        vector_layers = [];
        layers = self.plugin.layers_list()
        layers_tree_model = self.dialog.treeView.model()
        for layer in layers:
            layer_widget = layers_tree_model.findItems(
                layer.name(),
                Qt.MatchExactly | Qt.MatchRecursive
            )[0]
            # if layer is checked and vector column is checked as well
            if layer_widget.checkState() == Qt.Checked and \
                    layers_tree_model.columnItem(layer_widget, 1).checkState() == Qt.Checked:
                vector_layers.append(layer)
        return vector_layers

    def get_metadata(self):
        """Generate project's metadata (dictionary)."""
        dialog = self.dialog
        project = self.plugin.project
        map_canvas = self.plugin.iface.mapCanvas()

        project_keyword_list = project.readListEntry("WMSKeywordList", "/")[0]
        metadata = {
            'title': dialog.project_title.text(),
            'abstract': project.readEntry("WMSServiceAbstract", "/")[0],
            'contact_person': project.readEntry("WMSContactPerson", "/")[0],
            'contact_organization': project.readEntry("WMSContactOrganization", "/")[0],
            'contact_mail': project.readEntry("WMSContactMail", "/")[0],
            'contact_phone': project.readEntry("WMSContactPhone", "/")[0],
            'online_resource': project.readEntry("WMSOnlineResource", "/")[0],
            'fees': project.readEntry("WMSFees", "/")[0],
            'access_constrains': project.readEntry("WMSAccessConstraints", "/")[0],
            'keyword_list':project_keyword_list if project_keyword_list != [u''] else [],
            'authentication': AUTHENTICATION_OPTIONS[dialog.authentication.currentIndex()],
            'use_mapcache': dialog.use_mapcache.isChecked(),
            'publish_date_unix': int(time.time()),
            'publish_date': time.ctime(),
        }
        if self.dialog.enable_expiration.isChecked():
            metadata['expiration'] = self.dialog.expiration.date().toString("dd.MM.yyyy")
        renderer_context = map_canvas.mapRenderer().rendererContext()
        selection_color = renderer_context.selectionColor()
        canvas_color = map_canvas.canvasColor()

        project_extent = dialog.extent_layer.itemData(dialog.extent_layer.currentIndex())
        extent_buffer = dialog.extent_buffer.value()
        if extent_buffer != 0:
            project_extent = [
                project_extent[0]-extent_buffer,
                project_extent[1]-extent_buffer,
                project_extent[2]+extent_buffer,
                project_extent[3]+extent_buffer
            ]
        project_crs = map_canvas.mapRenderer().destinationCrs();
        metadata.update({
            'extent': project_extent,
            'extent_buffer': extent_buffer,
            'zoom_extent': [
                round(coord, 3) for coord in map_canvas.extent().toRectF().getCoords()
            ],
            'projection': {
                'code': project_crs.authid(),
                'is_geographic': project_crs.geographicFlag(),
                'proj4': project_crs.toProj4()
            },
            'units': self.plugin.map_units(),
            'selection_color': '{0}{1:02x}'.format(selection_color.name(), selection_color.alpha()),
            'canvas_color': '{0}{1:02x}'.format(canvas_color.name(), canvas_color.alpha()),
            'measure_ellipsoid': project.readEntry("Measure", "/Ellipsoid", "")[0],
            'position_precision': {
                'automatic': project.readBoolEntry("PositionPrecision", "/Automatic")[0],
                'decimal_places': project.readNumEntry("PositionPrecision", "/DecimalPlaces")[0]
            }
        })

        special_base_layers = []
        if dialog.blank.isChecked():
            special_base_layers.append({'title': 'Blank', 'name': 'BLANK', 'type': 'BLANK'})
        if metadata['projection']['code'].upper() == 'EPSG:3857':
            if dialog.osm.isChecked():
                special_base_layers.append(dict(OSM_LAYER))
            if dialog.google.currentIndex() > 0:
                special_base_layers.append(dict(GOOGLE_LAYERS[dialog.google.currentIndex()-1]))

        min_resolution = self.dialog.min_scale.itemData(self.dialog.min_scale.currentIndex())
        max_resolution = self.dialog.max_scale.itemData(self.dialog.max_scale.currentIndex())
        def publish_resolutions(resolutions, min_resolution=min_resolution, max_resolution=max_resolution):
            return filter(lambda res: res >= min_resolution and res <= max_resolution, resolutions)

        project_tile_resolutions = set(self.plugin.project_layers_resolutions())
        # collect set of all resolutions from special base layers and WMSC base layers
        for special_base_layer in special_base_layers:
            resolutions = special_base_layer.get('resolutions')
            if resolutions:
                project_tile_resolutions.update(resolutions)

        if not project_tile_resolutions:
            project_tile_resolutions = self.plugin.scales_to_resolutions(DEFAULT_PROJECT_SCALES)

        project_tile_resolutions = set(publish_resolutions(project_tile_resolutions))
        project_tile_resolutions = sorted(project_tile_resolutions, reverse=True)
        metadata['tile_resolutions'] = project_tile_resolutions
        metadata['scales'] = self.plugin.resolutions_to_scales(project_tile_resolutions)

        # create base layers metadata
        default_baselayer = self.dialog.default_baselayer.itemData(
            self.dialog.default_baselayer.currentIndex()
        )
        def base_layers_data(node):
            if node.children:
                sublayers_data = []
                for child in node.children:
                    sublayer_data = base_layers_data(child)
                    if sublayer_data:
                        sublayers_data.append(sublayer_data)
                if sublayers_data:
                    return {
                        'name': node.name,
                        'layers': sublayers_data
                    }
            else:
                layer = node.layer
                source_params = parse_qs(layer.source())
                layer_data = {
                    'name': layer.name(),
                    'provider_type': layer.providerType(),
                    'visible': layer.name() == default_baselayer,
                    'extent': map_canvas.mapRenderer().layerExtentToOutputExtent(
                        layer,
                        layer.extent()
                    ).toRectF().getCoords(),
                    'wms_layers': source_params['layers'][0].split(','),
                    'projection': source_params['crs'][0],
                    'format': source_params['format'][0],
                    'url': source_params['url'][0],
                    'dpi': layer.dataProvider().dpi(),
                    'metadata': {
                        'title': layer.title(),
                        'abstract': layer.abstract(),
                        'keyword_list': layer.keywordList()
                    }
                }
                if layer.attribution():
                    layer_data['attribution'] = {
                        'title': layer.attribution(),
                        'url': layer.attributionUrl()
                    }
                layer_resolutions = layer.dataProvider().property('resolutions')
                if layer_resolutions:
                    layer_resolutions = publish_resolutions(
                        self.plugin.wmsc_layer_resolutions(layer)
                    )
                    if not layer_resolutions:
                        return None
                    min_resolution = layer_resolutions[-1]
                    max_resolution = layer_resolutions[0]
                    upper_resolutions = filter(
                        lambda res: res > max_resolution,
                        project_tile_resolutions
                    )
                    lower_resolutions = filter(
                        lambda res: res < min_resolution,
                        project_tile_resolutions
                    )
                    layer_data.update({
                        'type': 'WMSC',
                        'min_resolution': min_resolution,
                        'max_resolution': max_resolution,
                        'resolutions': upper_resolutions + layer_resolutions + lower_resolutions,
                        'tile_size': [
                            layer.dataProvider().property('tileWidth') or 256,
                            layer.dataProvider().property('tileHeight') or 256
                        ]
                    })
                else:
                    layer_data.update({
                        'type': 'WMS',
                        'resolutions': project_tile_resolutions
                    })
                    if layer.hasScaleBasedVisibility():
                        layer_visible_resolutions = self.plugin.filter_visible_resolutions(
                            layer_data['resolutions'],
                            layer
                        )
                        if layer_visible_resolutions:
                            layer_data.update({
                                'min_resolution': layer_visible_resolutions[-1],
                                'max_resolution': layer_visible_resolutions[0],
                            })
                return layer_data

        if self.base_layers_tree:
            base_layers_metadata = base_layers_data(self.base_layers_tree)
        else:
            base_layers_metadata = {'layers': []}

        # insert special base layers metadata
        for special_base_layer in reversed(special_base_layers):
            special_base_layer['visible'] = special_base_layer['name'] == default_baselayer
            if 'resolutions' not in special_base_layer:
                special_base_layer['resolutions'] = project_tile_resolutions
            else:
                layer_resolutions = special_base_layer['resolutions']
                visible_resolutions = publish_resolutions(special_base_layer['resolutions'])
                special_base_layer['resolutions'] = visible_resolutions
                special_base_layer['min_zoom_level'] = layer_resolutions.index(visible_resolutions[0])
                special_base_layer['max_zoom_level'] = layer_resolutions.index(visible_resolutions[-1])

            if 'extent' not in special_base_layer:
                special_base_layer['extent'] = metadata['extent']
            base_layers_metadata['layers'].insert(0, special_base_layer)

        metadata['base_layers'] = base_layers_metadata.get('layers')

        non_identifiable_layers = project.readListEntry("Identify", "/disabledLayers")[0] or []

        overlays_order = [
            layer.id() for layer in self.plugin.layers_list()
                if self.plugin.is_overlay_layer_for_publish(layer)
        ]
        def create_overlays_data(node):
            sublayers = []
            for child in node.children:
                sublayer = create_overlays_data(child)
                if sublayer:
                    sublayers.append(sublayer)
            if sublayers:
                return {
                    'name': node.name,
                    'layers': sublayers
                }
            elif node.layer:
                layer = node.layer
                layers_model = dialog.treeView.model()
                layer_widget = layers_model.findItems(
                    layer.name(),
                    Qt.MatchExactly | Qt.MatchRecursive
                )[0]
                if layer_widget.checkState() == Qt.Unchecked or \
                        layers_model.columnItem(layer_widget, 1).checkState() == Qt.Checked:
                    return None

                if layer.extent().isFinite() and not layer.extent().isEmpty():
                    layer_extent = map_canvas.mapRenderer().layerExtentToOutputExtent(
                        layer,
                        layer.extent()
                    ).toRectF().getCoords()
                else:
                    layer_extent = project_extent
                layer_data = {
                    'name': layer.name(),
                    'provider_type': layer.providerType(),
                    'extent': layer_extent,
                    'projection': layer.crs().authid(),
                    'visible': self.plugin.iface.legendInterface().isLayerVisible(layer),
                    'queryable': layer.id() not in non_identifiable_layers,
                    'hidden': layers_model.columnItem(layer_widget, 3).checkState() == Qt.Checked,
                    'export_to_drawings': layers_model.columnItem(layer_widget, 2).checkState() == Qt.Checked,
                    'drawing_order': overlays_order.index(layer.id()),
                    'metadata': {
                        'title': layer.title(),
                        'abstract': layer.abstract(),
                        'keyword_list': layer.keywordList()
                    }
                }
                if layer.attribution():
                    layer_data['attribution'] = {
                        'title': layer.attribution(),
                        'url': layer.attributionUrl()
                    }
                if layer.hasScaleBasedVisibility():
                    layer_data['visibility_scale_min'] = max(layer.minimumScale(), metadata['scales'][-1])
                    layer_data['visibility_scale_max'] = min(layer.maximumScale(), metadata['scales'][0])

                if layer.type() == QgsMapLayer.VectorLayer:
                    layer_data['type'] = 'vector'
                    layer_label_settings = QgsPalLayerSettings()
                    layer_label_settings.readFromLayer(layer)
                    layer_data['labels'] = layer_label_settings.enabled
                    if layer.hasGeometryType():
                        layer_data['geom_type'] = ('POINT', 'LINE', 'POLYGON')[layer.geometryType()]

                    fields = layer.pendingFields()
                    attributes_data = []
                    excluded_attributes = layer.excludeAttributesWMS()
                    for field in fields:
                        if field.name() in excluded_attributes:
                            continue
                        attribute_data = {
                            'name': field.name(),
                            'type': field.typeName(),
                            #'length': field.length(),
                            #'precision': field.precision()
                        }
                        if field.comment():
                            attribute_data['comment'] = field.comment()
                        alias = layer.attributeAlias(fields.indexFromName(field.name()))
                        if alias:
                            attribute_data['alias'] = alias
                        attributes_data.append(attribute_data)

                    layer_data['attributes'] = attributes_data
                    layer_data['pk_attributes'] = [
                        fields.at(index).name() for index in layer.dataProvider().pkAttributeIndexes()
                    ]
                else:
                    layer_data['type'] = 'raster'
                return layer_data
        metadata['overlays'] = []
        if self.overlay_layers_tree:
            overlays_data = create_overlays_data(self.overlay_layers_tree)
            if overlays_data:
                metadata['overlays'] = overlays_data.get('layers')

        vector_layers_data = opt_value(self.plugin.metadata, 'vector_layers.layers', {})
        vector_layers = self.get_vector_layers()
        new_vector_layers_data = {}
        for vector_layer in vector_layers:
            new_vector_layers_data[vector_layer.name()] = vector_layers_data.get(vector_layer.name(), {})

        metadata['vector_layers'] = {
            'layers': new_vector_layers_data
        }

        composer_templates = []
        for composer in self.plugin.iface.activeComposers():
            composition = composer.composition()
            map_composer = composition.getComposerMapById(0)
            map_rect = map_composer.rect()
            composer_templates.append({
                # cannot get composer name other way
                'name': composer.composerWindow().windowTitle(),
                'width': composition.paperWidth(),
                'height': composition.paperHeight(),
                'map': {
                    'name': 'map0',
                    'width': map_rect.width(),
                    'height': map_rect.height()
                },
                'labels': [
                    item.id() for item in composition.items()
                        if isinstance(item, QgsComposerLabel) and item.id()
                ]
            })
        metadata['composer_templates'] = composer_templates

        message_text = dialog.message_text.toPlainText()
        if message_text:
            metadata['message'] = {
                'text': message_text,
                'valid_until': dialog.message_valid_until.date().toString("dd.MM.yyyy")
            }

        return metadata
