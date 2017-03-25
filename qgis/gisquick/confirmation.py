# -*- coding: utf-8 -*-
"""
/***************************************************************************
 Gisquick plugin
 Publish your projects into Gisquick application
 ***************************************************************************/
"""

import os
import shutil

# Import the PyQt and QGIS libraries
from qgis.core import *
from PyQt4.QtGui import *
from PyQt4.QtCore import *

from utils import opt_value, create_formatted_tree
from wizard import WizardPage


class ConfirmationPage(WizardPage):

    def __init__(self, plugin, page):
        super(ConfirmationPage, self).__init__(plugin, page)
        page.setButtonText(QWizard.CancelButton, "Close")
        page.setButtonText(QWizard.FinishButton, "Publish")

    def initialize(self):
        self._publish_dir = None
        self._publish_label_default = "Publish directory: (current directory)"
        self._datasources = {}

        self.dialog.label_publish_dir.setText(self._publish_label_default)
        self.dialog.button_publish_dir.clicked.connect(self.select_publish_dir)

    def select_publish_dir(self):
        self._publish_dir = str(QFileDialog.getExistingDirectory(self.dialog, "Select Directory"))
        if self._publish_dir:
            self.dialog.label_publish_dir.setText(
                "Publish directory: {0}".format(self._publish_dir)
            )
        else:
            self.dialog.label_publish_dir.setText(self._publish_label_default)


    def project_files(self):
        # Project files overview
        publish_filename = os.path.normpath(os.path.splitext(self.plugin.project.fileName())[0])
        publish_timestamp = str(self.plugin.metadata['publish_date_unix'])
        project_filename = "{0}_{1}.qgs".format(
            publish_filename,
            publish_timestamp
        )
        metadata_filename = "{0}_{1}.meta".format(
            publish_filename,
            publish_timestamp
        )

        return project_filename, metadata_filename


    def validate(self):
        return self.copy_published_project()

    def copy_published_project(self):
        def copy_project_files():
            project_filename, metadata_filename = self.project_files()
            try:
                shutil.copy(project_filename, self._publish_dir)
                shutil.copy(metadata_filename, self._publish_dir)
            except shutil.Error as e:
                raise StandardError("Copying project files failed: {0}".format(e))

        def copy_data_sources():
            messages = [] # error messages
            overwrite = [] # files to overwrite
            project_dir = os.path.dirname(self.plugin.project.fileName())
            # collect files to be copied
            publish_files = {}
            for ds in self._datasources.itervalues():
                for dsfile in ds:
                    if os.path.exists(dsfile) and os.path.isfile(dsfile):
                        publish_path = os.path.dirname(self._publish_dir + dsfile[len(project_dir):])
                        if publish_path not in publish_files:
                            publish_files[publish_path] = []

                        if os.path.splitext(dsfile)[1] == '.shp':
                            # Esri Shapefile (copy all files)
                            shpname = os.path.splitext(dsfile)[0]
                            for shpext in ('shp', 'shx', 'dbf', 'sbn', 'sbx',
                                           'fbn', 'fbx', 'ain', 'aih', 'atx',
                                           'ixs', 'mxs', 'prj', 'xml', 'cpg'):
                                shpfile = '{0}.{1}'.format(shpname, shpext)
                                if os.path.exists(shpfile):
                                    dstfile = os.path.join(publish_path, shpfile)
                                    if os.path.exists(dstfile):
                                        overwrite.append(dstfile)
                                    publish_files[publish_path].append(shpfile)
                        else:
                            # other formats (we expect one file per datasource)
                            dstfile = os.path.join(publish_path, os.path.basename(dsfile))
                            if os.path.exists(dstfile):
                                overwrite.append(dstfile)
                            publish_files[publish_path].append(dsfile)
                    else:
                        messages.append("Unsupported data source: {0} is not a file".format(dsfile))

            if overwrite:
                response = QMessageBox.question(self.dialog, "Overwrite",
                                                "Files:\n{0}\nalready exists. Do you want to overwrite them?".format(
                                                    os.linesep.join(overwrite if len(overwrite) < 6 else overwrite[:5] + ['...'])
                                                ),
                                                QMessageBox.Yes, QMessageBox.No)
                if response == QMessageBox.Yes:
                    overwrite = None

            # copy collected project files
            for publish_dir, project_files in publish_files.iteritems():
                try:
                    # create dirs if not exists
                    if not os.path.exists(os.path.dirname(publish_path)):
                        os.makedirs(os.path.dirname(publish_path))
                    for dsfile in project_files:
                        if overwrite:
                            # skip existing files
                            dstfile = os.path.join(publish_path, os.path.basename(dsfile))
                            if dstfile in overwrite:
                                continue
                        shutil.copy(dsfile, publish_path)
                except (shutil.Error, IOError) as e:
                    messages.append("Failed to copy data source: {0}".format(e))

            if messages:
                raise StandardError("Copying project files failed:\n{0}".format(os.linesep.join(messages)))

        if not self._publish_dir:
            return True

        try:
            copy_project_files()
            copy_data_sources()
        except StandardError as e:
            QMessageBox.critical(self.dialog, "Error", "{0}".format(e))
            return False

        return True


    def on_show(self):
        tree = self.dialog.tree_project_files
        create_formatted_tree(tree,
                              list(self.project_files())
        )
        tree.expandAll()

        # Data sources
        self._datasources = {}
        vector_data_file = opt_value(self.plugin.metadata, 'vector_layers.filename')
        if vector_data_file:
            self._datasources['Vector layers'] = [
                os.path.join(
                    os.path.dirname(
                        self.plugin.project.fileName()
                    ),
                    vector_data_file
                )
            ]

        def collect_layers_datasources(layer_node):
            for index in range(layer_node.rowCount()):
                collect_layers_datasources(
                    layer_node.child(index)
                )
            layer = layer_node.data(Qt.UserRole)
            if layer and layer_node.checkState() == Qt.Checked:
                layer_provider = layer.dataProvider()
                if isinstance(layer_provider, QgsVectorDataProvider):
                    storage_type = layer_provider.storageType()
                elif isinstance(layer_provider, QgsRasterDataProvider):
                    storage_type = 'Raster'
                else:
                    storage_type = 'Other'

                datasource_uri = QgsDataSourceURI( layer_provider.dataSourceUri() )
                datasource_db = datasource_uri.database()
                if datasource_db:
                    datasource_db = os.path.normpath(datasource_db)
                if storage_type not in self._datasources:
                    self._datasources[storage_type] = dict() if datasource_db else set()
                if datasource_db:
                    if datasource_db not in self._datasources[storage_type]:
                        self._datasources[storage_type][datasource_db] = []
                    if datasource_uri.schema():
                        table_name = '{0}.{1}'.format(datasource_uri.schema(), datasource_uri.table())
                    else:
                        table_name = datasource_uri.table()
                    table_item = [
                        "{0} ({1})".format(table_name, datasource_uri.geometryColumn())
                    ]
                    self._datasources[storage_type][datasource_db].append(table_item)
                    if datasource_uri.sql():
                        table_item.append(["SQL: {}".format(datasource_uri.sql())])
                else:
                    dsfile = layer_provider.dataSourceUri().split('|')[0].strip()
                    self._datasources[storage_type].add(os.path.normpath(dsfile))

        collect_layers_datasources(
            self.dialog.treeView.model().invisibleRootItem()
        )
        tree = self.dialog.tree_data_sources
        create_formatted_tree(tree, self._datasources)
        tree.expandAll()
