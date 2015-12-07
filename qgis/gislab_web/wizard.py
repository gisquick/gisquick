# -*- coding: utf-8 -*-
"""
/***************************************************************************
 GIS.lab Web plugin
 Publish your projects into GIS.lab Web application
 ***************************************************************************/
"""

class WizardPage(object):
    """Base class for a wizard page of the publishing dialog.

    Args:
        plugin (webgisplugin.WebGisPlugin): reference to webgis plugin
        page (PyQt4.QtGui.QWizardPage): GUI of the wizard page
        metadata (Dict[str, Any]): optional metadata from previously published project
    """
    def __init__(self, plugin, page, metadata=None):
        self.plugin = plugin
        self.dialog = plugin.dialog
        self.loaded_metadata = metadata
        self.initialized = False
        page.initializePage = self._initialize_page
        page.validatePage = self.validate
        page.handler = self

    def _initialize_page(self):
        if not self.initialized:
            self.initialize(self.loaded_metadata)
            self.initialized = True
        self.show()

    def initialize(self, metadata=None):
        """Method will be called for page initialization (before displayed for the first time).

        Args:
            metadata (Dict[str, Any]): optional metadata from previously published project
        """
        pass

    def show(self):
        """Method will be called each time this page is displayed in dialog."""
        pass

    def validate(self):
        """Method to validate page configuration - must evaluate to True to continue with next page.

        Returns:
            bool: True if page configuration is valid
        """
        return True

    def before_publish(self):
        """Method called right before publishing project."""
        pass

    def get_metadata(self):
        """Returns project's metadata from this wizard page.

        Returns:
            Dict[str, Any]: 
        """
        pass
