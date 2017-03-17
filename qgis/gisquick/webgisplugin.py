# -*- coding: utf-8 -*-
"""
/***************************************************************************
 Gisquick plugin
 Publish your projects into Gisquick application
 ***************************************************************************/
"""

import os
import sys
import re
import time
import json
import codecs
import subprocess
import ConfigParser
from decimal import Decimal

# Import the PyQt and QGIS libraries
import PyQt4.uic
from qgis.core import *
from PyQt4.QtGui import *
from PyQt4.QtCore import *

# Initialize Qt resources from file resources.py
import resources_rc

from utils import *
from project import ProjectPage
from topics import TopicsPage
from publish import PublishPage
from confirmation import ConfirmationPage


__metadata__ = ConfigParser.ConfigParser()
__metadata__.read(os.path.join(os.path.dirname(__file__), 'metadata.txt'))


class Node(object):
    """
    Tree node element for holding information about layers
    organization in the tree structure.
    """
    name = None
    layer = None
    parent = None
    children = None

    """
    Args:
        name (str): name of the node
        children (List[webgisplugin.Node], List[str]): array of node's children
        layer (qgis.core.QgsMapLayer): qgis layer attached to this node
    """
    def __init__(self, name, children=None, layer=None):
        self.name = name
        self.layer = layer
        self.children = []
        if children:
            self.append(*children)

    """
    Args:
        *nodes (str, webgisplugin.Node): nodes to be appended into this node.
            Strings will be automatically converted to webgisplugin.Node objects.
    """
    def append(self, *nodes):
        for node in nodes:
            if node is not None:
                if not isinstance(node, Node):
                    node = Node(node)
                node.parent = self
                self.children.append(node)

    """
    Search for node with given name, starting with this node and recursively
    continue with it's descendant nodes.

    Args:
        name (str): recursively (from this node) search for a node with given name

    Returns:
        webgisplugin.Node: node with given name, or None if there is no match
    """
    def find(self, name):
        if name == self.name:
            return self
        for child in self.children:
            res = child.find(name)
            if res:
                return res

    """
    Traverse the tree from this node (Post-order) and execute given
    function on each node.

    Args:
        fn (Callback[webgisplugin.Node]): function to be executed
    """
    def cascade(self, fn):
        for child in self.children:
            child.cascade(fn)
        fn(self)


class WebGisPlugin:

    dialog = None
    project = None

    def __init__(self, iface):
        # Save reference to the QGIS interface
        self.iface = iface
        # initialize plugin directory
        self.plugin_dir = os.path.dirname(__file__)
        # initialize locale
        locale = QSettings().value("locale/userLocale")[0:2]
        localePath = os.path.join(self.plugin_dir, 'i18n', 'webgisplugin_{}.qm'.format(locale))

        if os.path.exists(localePath):
            self.translator = QTranslator()
            self.translator.load(localePath)

            if qVersion() > '4.3.3':
                QCoreApplication.installTranslator(self.translator)

    def initGui(self):
        # Create action that will start plugin configuration
        self.action = QAction(
            QIcon(":/plugins/webgisplugin/icon.png"),
            u"Publish in Gisquick", self.iface.mainWindow())
        # connect the action to the run method
        self.action.triggered.connect(self.show_publish_dialog)

        # Add toolbar button and menu item
        self.iface.addToolBarIcon(self.action)
        self.iface.addPluginToWebMenu(u"&Gisquick", self.action)

    def unload(self):
        # Remove the plugin menu item and icon
        self.iface.removePluginMenu(u"&Gisquick", self.action)
        self.iface.removeToolBarIcon(self.action)

    def is_overlay_layer_for_publish(self, layer):
        """Checks whether layer can be published as an overlay layer.

        Args:
            layer (qgis.core.QgsMapLayer): project layer
 
        Returns:
            bool: True if a layer can be published as an overlay layer
        """
        return (layer.type() == QgsMapLayer.VectorLayer or
            (layer.type() == QgsMapLayer.RasterLayer and layer.providerType() != "wms"))

    def is_base_layer_for_publish(self, layer):
        """Checks whether layer could be published as a base layer.

        Args:
            layer (qgis.core.QgsMapLayer): project layer
 
        Returns:
            bool: True if a layer can be published as a base layer
        """
        return layer.type() == QgsMapLayer.RasterLayer and layer.providerType() == "wms"

    def map_units(self):
        """Returns units name of the project (map).

        Returns:
            str: map units name ('meters', 'feet', 'degrees', 'miles' or 'unknown')
        """
        return {
            0: 'meters',
            1: 'feet',
            2: 'degrees',
            3: 'unknown',
            7: 'miles'
        }[self.iface.mapCanvas().mapUnits()]

    def scales_to_resolutions(self, scales):
        """Converts map scales to tile resolutions (with fixed DPI=96).

        Args:
            scales (List[int]): array of map scales

        Returns:
            List[Decimal]: array of computed tile resolutions
        """
        return scales_to_resolutions(scales, self.map_units())

    def resolutions_to_scales(self, resolutions):
        """Converts tile resolutions to map scales (with fixed DPI=96).

        Args:
            resolutions (List[Decimal]): array of tile resolutions

        Returns:
            List[int]: array of computed map scales
        """
        return resolutions_to_scales(resolutions, self.map_units())

    def filter_visible_resolutions(self, resolutions, layer):
        """Filters given tile resolutions by layer's visibility settings.

        Args:
            resolutions (List[Decimal]): array of tile resolutions
            layer (qgis.core.QgsMapLayer): map layer

        Returns:
            List[Decimal]: array of visible tile resolutions
        """
        if layer.hasScaleBasedVisibility():
            max_scale_exclusive = layer.maximumScale()
            min_scale_inclusive = layer.minimumScale()
            max_res_exclusive, min_res_inclusive = self.scales_to_resolutions(
                [max_scale_exclusive, min_scale_inclusive]
            )
            return filter(
                lambda res: res >= min_res_inclusive and res < max_res_exclusive,
                resolutions
            )
        return resolutions

    def wmsc_layer_resolutions(self, layer):
        """Returns visible resolutions of given WMSC layer.

        Args:
            layer (qgis.core.QgsRasterLayer): raster layer (WMSC)

        Returns:
            List[Decimal]: array of layer's visible tile resolutions
        """
        layer_resolutions = layer.dataProvider().property('resolutions')
        if layer_resolutions:
            layer_resolutions = to_decimal_array(layer_resolutions)
            if layer.hasScaleBasedVisibility():
                layer_resolutions = self.filter_visible_resolutions(layer_resolutions, layer)
            if layer_resolutions:
                return sorted(layer_resolutions, reverse=True)
            return []
        return None

    def project_layers_resolutions(self):
        """Returns list of possible tile resolutions for current project.

        Returns:
            List[Decimal]: project tile resolutions
        """
        # compute resolutions as an union of resolutions calculated from project's
        # map scales and resolutions of all WMSC layers.
        project_tile_resolutions = set()

        # collect set of all resolutions from WMSC base layers
        base_layers = {
            layer.id(): layer
            for layer in self.iface.legendInterface().layers()
                if self.is_base_layer_for_publish(layer)
        }
        for layer in base_layers.itervalues():
            layer_resolutions = self.wmsc_layer_resolutions(layer)
            if layer_resolutions:
                project_tile_resolutions.update(layer_resolutions)

        wmsc_layers_scales = self.resolutions_to_scales(project_tile_resolutions)
        scales, ok = self.project.readListEntry("Scales", "/ScalesList")
        if ok and scales:
            scales = [int(scale.split(":")[-1]) for scale in scales]
            # filter duplicit scales
            scales = filter(lambda scale: scale not in wmsc_layers_scales, scales)
            project_tile_resolutions.update(
                self.scales_to_resolutions(sorted(scales, reverse=True))
            )

        project_tile_resolutions = sorted(project_tile_resolutions, reverse=True)
        return project_tile_resolutions

    def layers_list(self):
        """Returns array of all project's layers.

        Returns:
            List[qgis.core.QgsMapLayer]: project's layers
        """
        return self.iface.legendInterface().layers()

    def _get_project_layers_tree(self):
        """Returns root layer node of all project layers.

        Returns:
            webgisplugin.Node: project layers tree (root node)
        """
        legend_iface = self.iface.legendInterface()
        layers_reletionship = legend_iface.groupLayerRelationship()
        layers_root = Node('')
        for parent_name, child_names in layers_reletionship:
            parent = layers_root.find(parent_name)
            if not parent:
                parent = Node(parent_name)
                layers_root.append(parent)
            parent.append(*child_names)
        return layers_root

    def get_project_base_layers(self):
        """Returns root layer node of all base layers.

        Returns:
            webgisplugin.Node: project base layers tree (root node)
        """
        # build complete layers tree
        layers_root = self._get_project_layers_tree()

        # filter to base layers only
        base_layers = {
            layer.id(): layer
            for layer in self.layers_list()
                if self.is_base_layer_for_publish(layer)
        }

        def base_tree(node):
            base_children = []
            for child in node.children:
                base_child = base_tree(child)
                if base_child:
                    base_children.append(base_child)
            if base_children:
                return Node(node.name, base_children)
            elif not node.children and node.name in base_layers:
                return Node(node.name, layer=base_layers[node.name])
        return base_tree(layers_root)

    def get_project_layers(self):
        """Returns root layer node of project's overlay layers.

        Returns:
            webgisplugin.Node: project overlay layers tree (root node)
        """
        # build complete layers tree
        layers_root = self._get_project_layers_tree()

        # filter to overlay layers only
        overlay_layers = {
            layer.id(): layer
            for layer in self.layers_list()
                if self.is_overlay_layer_for_publish(layer)
        }
        def overlays_tree(node):
            overlay_children = []
            for child in node.children:
                overlay_child = overlays_tree(child)
                if overlay_child:
                    overlay_children.append(overlay_child)
            if overlay_children:
                return Node(node.name, overlay_children)
            elif not node.children and node.name in overlay_layers:
                return Node(node.name, layer=overlay_layers[node.name])

        return overlays_tree(layers_root)

    def _new_metadata(self):
        """Create a new metadata object with initial data.

        Returns:
            Dict[str, Any]: new metadata object
        """
        metadata = {}

        metadata['plugin_version'] = __metadata__.get('general', 'version')
        metadata['gislab_user'] = os.environ['USERNAME'] if sys.platform == 'win32' else os.environ['USER']
        metadata['publish_date_unix'] = int(time.time())
        metadata['publish_date'] = time.ctime()
        return metadata

    def _last_metadata(self):
        """Try to load metadata from last published version of this project.

        Returns:
            Dict[str, Any]: parsed metadata
        """
        project_filename = os.path.splitext(self.project.fileName())[0]
        metadata_pattern = re.compile(
            re.escape(
                os.path.basename(project_filename)
            ) + '_(\d{10})\.meta')
        matched_metadata_files = []
        for filename in os.listdir(os.path.dirname(self.project.fileName())):
            if filename.endswith('.meta'):
                match = metadata_pattern.match(filename)
                if match:
                    matched_metadata_files.append((int(match.group(1)), filename))

        if matched_metadata_files:
            # load last published metadata file
            metadata_filename = sorted(matched_metadata_files, reverse=True)[0][1]
            metadata_filename = os.path.join(
                os.path.dirname(self.project.fileName()),
                metadata_filename
            )
            if os.path.exists(metadata_filename):
                with codecs.open(metadata_filename, 'r', 'utf-8') as f:
                    return json.load(f)


    def show_publish_dialog(self):
        """Display dialog window for publishing current project.

        During a configuration process (wizard setup), plugin will hold actual metadata
        object in 'WebGisPlugin.metadata' property. If metadata from previous publishing
        still exist, they will be loaded and stored in 'WebGisPlugin.last_metadata' property.
        """

        if self.dialog and self.dialog.isVisible():
            return
        self.project = QgsProject.instance()
        if not self.project.fileName():
            QMessageBox.critical(
                None,
                'Error',
                'Create new QGIS project or open existing one before publishing to Gisquick'
            )
            return

        self.metadata = self._new_metadata()
        self.last_metadata = self._last_metadata() or {}

        dialog_filename = os.path.join(self.plugin_dir, "publish_dialog.ui")
        dialog = PyQt4.uic.loadUi(dialog_filename)
        self.dialog = dialog

        # wrap qt wizard pages (pure GUI defined in qt creator/designer) with wrapper
        # classes which containes application logic
        ProjectPage(self, dialog.wizard_page_project)
        TopicsPage(self, dialog.wizard_page_topics)
        PublishPage(self, dialog.wizard_page_publish)
        ConfirmationPage(self, dialog.wizard_page_confirmation)

        dialog.show()
        dialog.exec_()
