# -*- coding: utf-8 -*-
"""
/***************************************************************************
 Gisquick plugin
 Publish your projects into Gisquick application
 ***************************************************************************/
"""

# Import the PyQt and QGIS libraries
from qgis.core import *
from PyQt4.QtGui import *
from PyQt4.QtCore import *

from wizard import WizardPage


class TopicsPage(WizardPage):

    def _save_topic(self, topic_item):
        """Put actual topic configuration into given list item object.

        Args:
            topic_item (PyQt4.QtGui.QListWidgetItem): topic list item
        """
        visible_overlays = []
        def collect_visible_overlays(widget):
            if widget.data(0, Qt.UserRole):
                if not widget.isDisabled() and widget.checkState(0) == Qt.Checked:
                    visible_overlays.append(widget.text(0))
            else:
                for index in range(widget.childCount()):
                    collect_visible_overlays(widget.child(index))
        collect_visible_overlays(self.dialog.topicLayers.invisibleRootItem())
        topic_item.setData(Qt.UserRole, {
            'abstract': self.dialog.topicAbstract.toPlainText(),
            'visible_overlays': visible_overlays
        })

    def _create_topics_list(self, topics):
        """Builds qt list with topics items from given data.

        Args:
            topics (Dict[str, Any]): topics data (title, abstract, visible_overlays)
        """
        for topic_data in topics:
            item = QListWidgetItem(topic_data.pop('title'))
            item.setFlags(item.flags() | Qt.ItemIsEditable)
            item.setData(Qt.UserRole, topic_data)
            self.dialog.topicsList.addItem(item)

    def _topic_selection_changed(self, current, previous):
        """Handles changes of seleced topic items - configure GUI components for
        current (selected) topic.
        """
        dialog = self.dialog
        if previous is None:
            dialog.topicWidget.setEnabled(True)
        else:
            self._save_topic(previous)
        if current:
            # update topic GUI widgets by topic data
            current_data = current.data(Qt.UserRole) or {}
            dialog.topicAbstract.setPlainText(current_data.get('abstract', ''))
            visible_overlays = current_data.get('visible_overlays')
            def set_visible_overlays(widget):
                if widget.data(0, Qt.UserRole):
                    if not widget.isDisabled():
                        if visible_overlays:
                            check_state = Qt.Checked if widget.text(0) in visible_overlays else \
                                          Qt.Unchecked
                            widget.setCheckState(0, check_state)
                        else:
                            widget.setCheckState(0, Qt.Checked)
                else:
                    for index in range(widget.childCount()):
                        set_visible_overlays(widget.child(index))
            set_visible_overlays(dialog.topicLayers.invisibleRootItem())


    def initialize(self, metadata=None):
        self.dialog.topicWidget.setEnabled(False)
        self.dialog.topicsList.currentItemChanged.connect(self._topic_selection_changed)

        topics = self.plugin.last_metadata.get('topics');
        if topics:
            try:
                self._create_topics_list(topics)
            except:
                QMessageBox.warning(
                    None,
                    'Warning',
                    'Failed to load previously configured topics'
                )
        else:
            # create default topic
            default_topic = {
                'title': 'Default topic',
                'abstract': 'Default layers configuration',
            }
            self._create_topics_list([default_topic])
        self.dialog.topicsList.setCurrentRow(0)

    def on_show(self):
        dialog = self.dialog
        def add_topic():
            item = QListWidgetItem("New topic")
            item.setFlags(item.flags() | Qt.ItemIsEditable)
            dialog.topicsList.addItem(item)
            dialog.topicsList.editItem(item)
            dialog.topicsList.setCurrentRow(dialog.topicsList.count()-1)

        def remove_topic():
            dialog.topicsList.takeItem(dialog.topicsList.row(dialog.topicsList.selectedItems()[0]))
            if dialog.topicsList.count() == 0:
                dialog.topicWidget.setEnabled(False)
                dialog.topicAbstract.setPlainText('')

        dialog.addTopic.released.connect(add_topic)
        dialog.removeTopic.released.connect(remove_topic)

        def create_layers_tree(layer_node):
            """Builds layers tree widget"""
            widget = QTreeWidgetItem()
            widget.setText(0, layer_node.get('title', layer_node['name']))
            if 'layers' in layer_node:
                for child_node in layer_node['layers']:
                    widget.addChild(create_layers_tree(child_node))
            else:
                widget.setData(0, Qt.UserRole, layer_node)

            widget.setFlags(
                  Qt.ItemIsEnabled
                | Qt.ItemIsSelectable
                | Qt.ItemIsUserCheckable
                | Qt.ItemIsTristate
            )
            widget.setCheckState(0, Qt.Checked)
            widget.setDisabled(layer_node.get('hidden', False))
            return widget

        # create virtual root layers node and build qt tree widget
        for index in range(dialog.topicLayers.topLevelItemCount()):
            dialog.topicLayers.takeTopLevelItem(0)
        dialog.topicLayers.addTopLevelItems(
            create_layers_tree(
                {
                    'name': 'root',
                    'layers': self.plugin.metadata['overlays']
                }
            ).takeChildren() # without root node widget
        )

        self._topic_selection_changed(self.dialog.topicsList.currentItem(), None)


    def on_return(self):
        self.plugin.metadata.update(self.get_metadata())

    def validate(self):
        self.plugin.metadata.update(self.get_metadata())
        return True

    def get_metadata(self):
        """Returns list of topics data (title, abstract, visible layers)"""
        dialog = self.dialog
        if dialog.topicsList.selectedItems():
            self._save_topic(dialog.topicsList.selectedItems()[0])
        topics = []
        for index in range(dialog.topicsList.count()):
            item = dialog.topicsList.item(index)
            topic_data = dict(item.data(Qt.UserRole))
            topic_data['title'] = item.text()
            topics.append(topic_data)
        return {'topics': topics}
