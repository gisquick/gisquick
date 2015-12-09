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
    """
    def __init__(self, plugin, page):
        self.plugin = plugin
        self.dialog = plugin.dialog
        self.initialized = False
        page.initializePage = self._initialize_page
        page.validatePage = self.validate
        page.cleanupPage = self.on_return
        page.handler = self

    def _initialize_page(self):
        if not self.initialized:
            self.initialize()
            self.initialized = True
        self.on_show()

    def initialize(self):
        """Method will be called for page initialization (before displayed for the first time)."""
        pass

    def on_show(self):
        """Method will be called each time this page is displayed (from previous page)."""
        pass

    def on_return(self):
        """Method will be called on return to a previous page."""
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
