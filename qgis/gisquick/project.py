# -*- coding: utf-8 -*-
"""
/***************************************************************************
 Gisquick plugin
 Publish your projects into Gisquick application
 ***************************************************************************/
"""

import os
import re
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

layer_resolutions = to_decimal_array(
    """156543.03390625,78271.516953125,39135.7584765625,19567.87923828125,9783.939619140625,
    4891.9698095703125,2445.9849047851562,1222.9924523925781,611.4962261962891,305.74811309814453,
    152.87405654907226,76.43702827453613,38.218514137268066,19.109257068634033,9.554628534317017,
    4.777314267158508,2.388657133579254,1.194328566789627,0.5971642833948135"""
)
layer_extent = [-16319611.284727, -5615981.3413867, 16319611.284727, 5615981.3413867]
BLANK_LAYER = {
    'name': 'Blank',
    'type': 'blank',
    'metadata': {
        'abstract': 'Blank base map layer.',
        'keyword_list': 'blank, world map'
    }
}
OSM_LAYER = {
    'name': 'OpenStreetMap',
    'type': 'osm',
    'resolutions': layer_resolutions,
    'extent': layer_extent,
    'metadata': {
        'abstract': 'OpenStreetMap (OSM) is a collaborative project to create a free editable map of the world.',
        'keyword_list': 'free, collaborative, world map'
    }
}
MAPBOX_LAYER = {
    'name': 'MapBox',
    'type': 'mapbox',
    'resolutions': layer_resolutions,
    'extent': layer_extent
}
BING_LAYERS = (
    {
    'name': 'BingMaps Road',
    'serverName': 'BingRoad',
    'type': 'bing',
    'style': 'Road',
    'resolutions': layer_resolutions,
    'extent': layer_extent
    },
    {
    'name': 'BingMaps Aerial',
    'serverName': 'BingAerial',
    'type': 'bing',
    'style': 'Aerial',
    'resolutions': layer_resolutions,
    'extent': layer_extent
    },
    {
    'name': 'BingMaps Aerial with Labels',
    'serverName': 'BingAerialWL',
    'type': 'bing',
    'style': 'AerialWithLabels',
    'resolutions': layer_resolutions,
    'extent': layer_extent
    }
)

MSG_ERROR = "Error"
MSG_WARNING = "Warning"


class ProjectPage(WizardPage):

    def _show_messages(self, messages):
        """Display messages in dialog window (do not ignore existing content if available).

        Args:
            messages (List[Tuple[str, str]]): list of messages (composed of message type and text)
        """
        dialog = self.dialog
        table = dialog.info_table
        if messages:
            dialog.errors_group.setVisible(True)
            red = QColor.fromRgb(255, 0, 0)
            orange = QColor("#FF7F2A")
            for index, message in enumerate(messages):
                row_index = table.rowCount()
                msg_type, msg_text = message
                if len(table.findItems(msg_text, Qt.MatchExactly)) < 1:
                    item = QTableWidgetItem(msg_type)
                    if msg_type == MSG_ERROR:
                        item.setForeground(red)
                        self._num_errors +=1
                    else:
                        item.setForeground(orange)
                    table.insertRow(row_index) # keep order of statements (see completeChanged)
                    dialog.info_table.setItem(row_index, 0, item)
                    dialog.info_table.setItem(row_index, 1, QTableWidgetItem(msg_text))
        else:
            dialog.errors_group.setVisible(False)

    def _remove_messages(self, messages):
        """Remove messages from dialog window

        Args:
            messages (List[Tuple[str, str]]): list of messages (composed of message type and text)
        """
        dialog = self.dialog
        table = dialog.info_table
        if not messages:
            return

        for index, message in enumerate(messages):
            msg_type, msg_text = message
            for item in table.findItems(msg_text, Qt.MatchExactly):
                if msg_type == MSG_ERROR: # keep order of statements (see completeChanged)
                    self._num_errors -= 1
                table.removeRow(table.row(item))

    def is_project_valid(self):
        """Checks whether all conditions for publishing project is satisfied
        and shows list of encountered warnings/errors."""
        messages = []
        if self.plugin.project.isDirty():
            messages.append((
                MSG_ERROR,
                u"Project has been modified. Save it before trying to continue."
            ))

        crs_transformation, ok = self.plugin.project.readBoolEntry(
            "SpatialRefSys",
            "/ProjectionsEnabled"
        )
        if not ok or not crs_transformation:
            messages.append((
                MSG_WARNING,
                u"'On-the-fly' CRS transformation is disabled. Enable it when using " \
                "layers with different CRSs."
            ))

        map_canvas = self.plugin.iface.mapCanvas()
        try:
            crs_dst = map_canvas.mapSettings().destinationCrs()
        except:
            crs_dst = map_canvas.mapRenderer().destinationCrs()
        if crs_dst.authid().startswith('USER:'):
            messages.append((
                MSG_ERROR,
                u"Project is using custom CRS which is currently not supported."
            ))

        all_layers = [layer.name() for layer in self.plugin.layers_list()]
        if len(all_layers) != len(set(all_layers)):
            messages.append((
                MSG_ERROR,
                u"Project contains layers with the same names. Rename one " \
                "before trying to continue."
            ))

        wfs_layers = self.plugin.project.readListEntry("WFSLayers", "/")[0] or []
        if (not wfs_layers):
            messages.append((
                MSG_WARNING,
                u"WFS service is not allowed on any layer, identification and attribute tables " \
                "will not be enabled (Project Properties -> OWS Server -> WFS capabilities)."
            ))

        self._show_messages(messages)
        return len(filter(lambda msg: msg[0] == MSG_ERROR, messages)) == 0

    def is_page_config_valid(self):
        """Checks project configuration on this page and shows list of
        encountered warnings/errors."""
        messages = []

        msg = u"Project title is missing. Enter project name before trying to continue."
        if not self.dialog.project_title.text():
            messages.append((MSG_ERROR, msg))
        else:
            self._remove_messages([(MSG_ERROR, msg)])

        min_resolution = self.dialog.min_scale.itemData(self.dialog.min_scale.currentIndex())
        max_resolution = self.dialog.max_scale.itemData(self.dialog.max_scale.currentIndex())
        msg = u"Invalid map scales range."
        if min_resolution > max_resolution:
            messages.append((MSG_ERROR, msg))
        else:
            self._remove_messages([(MSG_ERROR, msg)])

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
                    u"Base layer '{0}' is using custom CRS " \
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
        for layer in self.get_published_layers():
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
                    u"Overlay layer '{0}' is using custom CRS " \
                    "which is currently not supported.".format(layer.name())
                ))

        project_dir = os.path.dirname(os.path.normpath(self.plugin.project.fileName()))+os.path.sep
        for file_datasource in file_datasources:
            if not os.path.normpath(file_datasource).startswith(project_dir):
                messages.append((
                    MSG_ERROR,
                    u"Data file '{0}' is located outside of the QGIS project "
                    "directory. ".format(os.path.basename(file_datasource))
                ))

        if messages:
            self._show_messages(messages)
        return len(filter(lambda msg: msg[0] == MSG_ERROR, messages)) == 0

    def validate(self):
        if self.project_valid and self.is_page_config_valid():
            self.plugin.metadata.update(
                self.get_metadata()
            )
            return True
        return False

    def setup_page(self, metadata):
        """Setup page (GUI components) from already existing metadata.

        Args:
            metadata (Dict[str, Any]): metadata object
        """
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
            try:
                auth_index = AUTHENTICATION_OPTIONS.index(authentication)
            except ValueError:
                auth_index = 1
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
                if base_layer['type'] == 'blank':
                    dialog.blank.setChecked(True)
                elif base_layer['type'] == 'osm':
                    dialog.osm.setChecked(True)
                elif base_layer['type'] == 'mapbox':
                    dialog.mapbox.setChecked(True)
                    if 'mapid' in base_layer:
                        index = dialog.mapbox_mapid.findText(base_layer['mapid'])
                        if index >= 0:
                            dialog.mapbox_mapid.setCurrentIndex(index)
                    if 'apikey' in base_layer:
                        dialog.mapbox_apikey.setText(base_layer['apikey'])
                elif base_layer['type'] == 'bing':
                    dialog.bing.setChecked(True)
                    for index, glayer in enumerate(BING_LAYERS):
                        if glayer['name'] == base_layer['name']:
                            dialog.bing_style.setCurrentIndex(index)
                            break
                    if 'apikey' in base_layer:
                        dialog.bing_apikey.setText(base_layer['apikey'])
                else:
                    # at least one base layer must be enabled (default is Blank)
                    dialog.blank.setChecked(True)

                if base_layer['visible']:
                    dialog.default_baselayer.setCurrentIndex(
                        dialog.default_baselayer.findText(base_layer['name'])
                    )
        else:
            # at least one base layer must be enabled (default is Blank)
            dialog.blank.setChecked(True)

        overlays_data = extract_layers(metadata['overlays'])
        project_overlays = [layer_data['name'] for layer_data in overlays_data]
        hidden_overlays = [
            layer_data['name'] for layer_data in overlays_data
                if layer_data.get('hidden')
        ]
        # Recursively setup layer widgets from prevoius info about layers types
        def load_layers_settings(group_item):
            for index in range(group_item.rowCount()):
                child_item = group_item.child(index)
                if child_item.data(Qt.UserRole):
                    layer_name = child_item.text()

                    child_item.setCheckState(
                        Qt.Checked if layer_name in project_overlays else Qt.Unchecked
                    )
                    if layer_name in hidden_overlays:
                        layers_model = child_item.model()
                        layers_model.columnItem(child_item, 1).setCheckState(Qt.Checked)
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
        dialog.info_table.model().rowsInserted.connect(self._page.completeChanged)
        dialog.info_table.model().rowsRemoved.connect(self._page.completeChanged)

        self._num_errors = 0
        self.project_valid = self.is_project_valid()
        if not self.project_valid:
            return

        title = self.plugin.project.title() or self.plugin.project.readEntry("WMSServiceTitle", "/")[0]
        if title:
            dialog.project_title.setText(title)
        else:
            self._show_messages([(
                MSG_ERROR,
                u"Project title is missing. Enter project name before trying "
                "to continue."
            )])

        map_canvas = self.plugin.iface.mapCanvas()
        self.base_layers_tree = self.plugin.get_project_base_layers()
        self.overlay_layers_tree = self.plugin.get_project_layers()

        def expiration_toggled(checked):
            dialog.expiration.setEnabled(checked)
        dialog.enable_expiration.toggled.connect(expiration_toggled)
        dialog.expiration.setDate(datetime.date.today() + datetime.timedelta(days=1))

        resolutions = self.plugin.project_layers_resolutions()
        self._update_min_max_scales(resolutions)

        def check_base_layer_enabled():
            msg = "At least one base layer must be enabled."
            if dialog.default_baselayer.count() < 1:
                self._show_messages([(MSG_ERROR, msg)])
            else:
                self._remove_messages([(MSG_ERROR, msg)])

        def blank_toggled(checked):
            if checked:
                dialog.default_baselayer.insertItem(0, BLANK_LAYER['name'])
            else:
                dialog.default_baselayer.removeItem(0)
            check_base_layer_enabled()

        def osm_toggled(checked, project_resolutions=resolutions):
            resolutions = set(project_resolutions)
            position = 1 if dialog.blank.isChecked() else 0
            if checked:
                dialog.default_baselayer.insertItem(position, OSM_LAYER['name'])
                resolutions.update(OSM_LAYER['resolutions'])
            else:
                dialog.default_baselayer.removeItem(position)
            if dialog.mapbox.isChecked():
                resolutions.update(MAPBOX_LAYER['resolutions'])
            if dialog.bing.isChecked():
                resolutions.update(BING_LAYERS[0]['resolutions'])

            self._update_min_max_scales(resolutions)
            check_base_layer_enabled()

        def check_apikey(text, provider):
            msg_missing = u"{0} ApiKey must be defined.".format(provider)
            msg_invalid = u"Invalid {0} ApiKey (should start with 'pk.' or 'sk.').".format(provider)
            if text is None:
                self._remove_messages([(MSG_ERROR, msg_missing)])
            elif len(text) > 0:
                if provider == 'MapBox':
                    if text.startswith('pk.') or text.startswith('sk.'):
                        self._remove_messages([(MSG_ERROR, msg_invalid)])
                        self._remove_messages([(MSG_ERROR, msg_missing)])
                    else:
                        self._show_messages([(MSG_ERROR, msg_invalid)])
                else:
                    self._remove_messages([(MSG_ERROR, msg_missing)])
            else:
                self._remove_messages([(MSG_ERROR, msg_invalid)])
                self._show_messages([(MSG_ERROR, msg_missing)])

        def mapbox_apikey_changed(text):
            check_apikey(text, 'MapBox')

        def mapbox_toggled(checked, project_resolutions=resolutions):
            resolutions = set(project_resolutions)

            dialog.mapbox_mapid.setEnabled(checked)
            dialog.mapbox_apikey.setEnabled(checked)
            
            position = 1 if dialog.blank.isChecked() else 0
            if dialog.osm.isChecked():
                position += 1
                resolutions.update(OSM_LAYER['resolutions'])
            if checked:
                dialog.default_baselayer.insertItem(position, MAPBOX_LAYER['name'])
                resolutions.update(MAPBOX_LAYER['resolutions'])
            else:
                dialog.default_baselayer.removeItem(position)
            if dialog.bing.isChecked():
                resolutions.update(BING_LAYERS[0]['resolutions'])
            
            self._update_min_max_scales(resolutions)

            if checked:
                check_apikey(dialog.mapbox_apikey.text(), 'MapBox')
            else:
                check_apikey(None, 'MapBox')
            check_base_layer_enabled()

        def bing_apikey_changed(text):
            check_apikey(text, 'BingMaps')

        def bing_toggled(checked, project_resolutions=resolutions):
            resolutions = set(project_resolutions)

            dialog.bing_style.setEnabled(checked)
            dialog.bing_apikey.setEnabled(checked)
            
            position = 1 if dialog.blank.isChecked() else 0
            if dialog.osm.isChecked():
                position += 1
                resolutions.update(OSM_LAYER['resolutions'])
            if dialog.mapbox.isChecked():
                position += 1
                resolutions.update(MAPBOX_LAYER['resolutions'])
            if checked:
                index = dialog.bing_style.currentIndex()
                dialog.default_baselayer.insertItem(position, BING_LAYERS[index]['name'])
                resolutions.update(BING_LAYERS[index]['resolutions'])
            else:
                dialog.default_baselayer.removeItem(position)
            
            self._update_min_max_scales(resolutions)

            if checked:
                check_apikey(dialog.bing_apikey.text(), 'BingMaps')
            else:
                check_apikey(None, 'BingMaps')
            check_base_layer_enabled()

        def bing_layer_changed(index):
            position = 1 if dialog.blank.isChecked() else 0
            if dialog.osm.isChecked():
                position += 1
            if dialog.mapbox.isChecked():
                position += 1
            bing_layer = BING_LAYERS[index]
            dialog.default_baselayer.setItemText(position, bing_layer['name'])
                
        dialog.blank.toggled.connect(blank_toggled)
        dialog.osm.toggled.connect(osm_toggled)
        dialog.mapbox.toggled.connect(mapbox_toggled)
        dialog.mapbox_apikey.textChanged.connect(mapbox_apikey_changed)
        dialog.bing.toggled.connect(bing_toggled)
        dialog.bing_style.currentIndexChanged.connect(bing_layer_changed)
        dialog.bing_apikey.textChanged.connect(bing_apikey_changed)
        
        def scales_changed(index):
            self.is_page_config_valid()
        dialog.min_scale.currentIndexChanged.connect(scales_changed)
        dialog.max_scale.currentIndexChanged.connect(scales_changed)

        try:
            map_settings = map_canvas.mapSettings()
        except:
            map_settings = map_canvas.mapRenderer()
        projection = map_settings.destinationCrs().authid()
        dialog.osm.setEnabled(projection == 'EPSG:3857')
        dialog.mapbox.setEnabled(projection == 'EPSG:3857')
        dialog.bing.setEnabled(projection == 'EPSG:3857')

        dialog.extent_layer.addItem(
            "All layers",
            list(map_canvas.fullExtent().toRectF().getCoords())
        )
        for layer in self.plugin.layers_list():
            if self.plugin.is_base_layer_for_publish(layer):
                dialog.default_baselayer.addItem(layer.name())
            if self.plugin.is_base_layer_for_publish(layer) or \
                    self.plugin.is_overlay_layer_for_publish(layer):
                extent = list(
                    map_settings.layerExtentToOutputExtent(
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
                hidden.setFlags(
                      Qt.ItemIsEnabled
                    | Qt.ItemIsSelectable
                    | Qt.ItemIsUserCheckable
                    | Qt.ItemIsTristate
                )
                hidden.setCheckState(Qt.Unchecked)

                return [layer_item, hidden]

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
                ['Layer', 'Hidden']
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
                        item.model().columnItem(item, 1).setEnabled(enabled)

            layers_model.itemChanged.connect(layer_item_changed)

        if self.plugin.last_metadata:
            try:
                self.setup_page(self.plugin.last_metadata)
            except StandardError as e:
                QMessageBox.warning(
                    None,
                    'Warning',
                    'Failed to load settings from last published version: {0}'.format(e)
                )

        # at least one base layer must be enabled
        if dialog.default_baselayer.count() < 1:
            dialog.blank.setChecked(True)

    def is_complete(self):
        return self.initialized and self.project_valid and self._num_errors < 1
        
    def get_published_layers(self, **layer_filter):
        """Returns array of qgis layers selected for publishing, optionally filtered by
        additional arguments.

        Args:
            **layer_filter (bool): additional filters (possible arguments: 'vector' - for
                layers exported in vector format, and 'hidden' - for hidden layers)

        Returns:
            List[qgis.core.QgsVectorLayer]: array of published qgis layers
        """
        vector_layers = []
        layers = self.plugin.layers_list()
        layers_tree_model = self.dialog.treeView.model()
        for layer in layers:
            try:
                layer_widget = layers_tree_model.findItems(
                    layer.name(),
                    Qt.MatchExactly | Qt.MatchRecursive
                )[0]
            except IndexError:
                continue # skip base layers (user-defined WMS)

            # if layer is checked for publishing
            if layer_widget.checkState() == Qt.Checked:
                # check additional filters
                if 'hidden' in layer_filter:
                    state = Qt.Checked if layer_filter['hidden'] else Qt.Unchecked
                    if layers_tree_model.columnItem(layer_widget, 1).checkState() != state:
                        continue
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
            'use_mapcache': dialog.use_mapcache.isChecked()
        }
        metadata['expiration'] = ""
        if self.dialog.enable_expiration.isChecked():
            metadata['expiration'] = self.dialog.expiration.date().toString("dd.MM.yyyy")

        try:
            map_settings = map_canvas.mapSettings()
        except:
            map_settings = map_canvas.mapRenderer()
        selection_color = map_settings.selectionColor()
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
        project_crs = map_settings.destinationCrs()
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
            special_base_layers.append(dict(BLANK_LAYER))
        if metadata['projection']['code'].upper() == 'EPSG:3857':
            if dialog.osm.isChecked():
                special_base_layers.append(dict(OSM_LAYER))
            if dialog.mapbox.isChecked():
                special_base_layers.append(dict(MAPBOX_LAYER))
            if dialog.bing.isChecked() > 0:
                special_base_layers.append(dict(BING_LAYERS[dialog.bing_style.currentIndex()]))

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
        default_baselayer_name = self.dialog.default_baselayer.currentText()
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
                try:
                    map_settings = map_canvas.mapSettings()
                except:
                    map_settings = map_canvas.mapRenderer()
                layer = node.layer
                source_params = parse_qs(layer.source())
                layer_data = {
                    'name': layer.name(),
                    'serverName': layer.shortName() if hasattr(layer, 'shortName') else layer.name(),
                    'provider_type': layer.providerType(),
                    'visible': layer.name() == default_baselayer_name,
                    'extent': map_settings.layerExtentToOutputExtent(
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
                        'type': 'wmsc',
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
                        'type': 'wms',
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
            special_base_layer['visible'] = special_base_layer['name'] == default_baselayer_name
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

            if special_base_layer['name'] == 'MAPBOX':
                mapid = special_base_layer['mapid'] = dialog.mapbox_mapid.currentText()
                special_base_layer['apikey'] = dialog.mapbox_apikey.text()
                if mapid.startswith('mapbox.'):
                    prefix, title = mapid.split('.', 1)
                    title = ' '.join(map(lambda x: x.title(), title.split('-')))
                    special_base_layer['title'] += ' {}'.format(title)
            elif special_base_layer['name'].startswith('BING'):
                special_base_layer['apikey'] = dialog.bing_apikey.text()

            base_layers_metadata['layers'].insert(0, special_base_layer)

        metadata['base_layers'] = base_layers_metadata.get('layers')

        non_identifiable_layers = project.readListEntry("Identify", "/disabledLayers")[0] or []

        if self.plugin.iface.layerTreeCanvasBridge().hasCustomLayerOrder():
            overlays_order = self.plugin.iface.layerTreeCanvasBridge().customLayerOrder()
        else:
            overlays_order = [
                layer.id() for layer in self.plugin.layers_list()
            ]
        wfs_layers = self.plugin.project.readListEntry("WFSLayers", "/")[0] or []
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

                if layer_widget.checkState() == Qt.Unchecked:
                    return None

                if layer.extent().isFinite() and not layer.extent().isEmpty():
                    try:
                        map_settings = map_canvas.mapSettings()
                    except:
                        map_settings = map_canvas.mapRenderer()
                    layer_extent = map_settings.layerExtentToOutputExtent(
                        layer,
                        layer.extent()
                    ).toRectF().getCoords()
                else:
                    layer_extent = project_extent
                is_hidden = layers_model.columnItem(layer_widget, 1).checkState() == Qt.Checked
                layer_data = {
                    'name': layer.name(),
                    'serverName': layer.shortName() if hasattr(layer, 'shortName') else layer.name(),
                    'provider_type': layer.providerType(),
                    'extent': layer_extent,
                    'projection': layer.crs().authid(),
                    'visible': self.plugin.iface.legendInterface().isLayerVisible(layer),
                    'queryable': not is_hidden and layer.id() not in non_identifiable_layers,
                    'hidden': is_hidden,
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
                    excluded_attributes = layer.excludeAttributesWFS()
                    layer_wfs_allowed = layer.id() in wfs_layers
                    conversion_types = {
                        'BIGINT': 'INTEGER',
                        'INTEGER64': 'INTEGER',
                        'REAL': 'DOUBLE',
                        'STRING': 'TEXT'
                    }
                    if layer_wfs_allowed:
                        for field in fields:
                            if field.name() in excluded_attributes:
                                continue
                            field_type = field.typeName().upper()
                            if field_type in conversion_types:
                                field_type = conversion_types[field_type]
                            attribute_data = {
                                'name': field.name(),
                                'type': field_type,
                                #'length': field.length(),
                                #'precision': field.precision()
                            }
                            if field.comment():
                                attribute_data['comment'] = field.comment()
                            alias = layer.attributeAlias(fields.indexFromName(field.name()))
                            if alias:
                                attribute_data['alias'] = alias
                            attributes_data.append(attribute_data)

                    if attributes_data:
                        layer_data['attributes'] = attributes_data
                        layer_data['pk_attributes'] = [
                            fields.at(index).name() for index in layer.dataProvider().pkAttributeIndexes()
                        ]
                    else:
                        layer_data['queryable'] = False
                else:
                    layer_data['type'] = 'raster'
                return layer_data
        metadata['overlays'] = []
        if self.overlay_layers_tree:
            overlays_data = create_overlays_data(self.overlay_layers_tree)
            if overlays_data:
                metadata['overlays'] = overlays_data.get('layers')

        composer_templates = []
        for composer in self.plugin.iface.activeComposers():
            composition = composer.composition()
            map_composer = composition.getComposerMapById(0)
            map_rect = map_composer.rect()
            composer_data = {
                # cannot get composer name other way
                'name': composer.composerWindow().windowTitle(),
                'width': composition.paperWidth(),
                'height': composition.paperHeight(),
                'map': {
                    'name': 'map0',
                    'x': map_composer.x(),
                    'y': map_composer.y(),
                    'width': map_rect.width(),
                    'height': map_rect.height()
                },
                'labels': [
                    item.id() for item in composition.items()
                        if isinstance(item, QgsComposerLabel) and item.id()
                ]
            }
            grid = map_composer.grid()
            if grid and grid.enabled():
                composer_data['map']['grid'] = {
                    'intervalX': grid.intervalX(),
                    'intervalY': grid.intervalY(),
                }
            composer_templates.append(composer_data)
        metadata['composer_templates'] = composer_templates

        metadata['message'] = None
        message_text = dialog.message_text.toPlainText()
        if message_text:
            metadata['message'] = {
                'text': message_text,
                'valid_until': dialog.message_valid_until.date().toString("dd.MM.yyyy")
            }

        return metadata
