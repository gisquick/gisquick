# -*- coding: utf-8 -*-
"""
/***************************************************************************
 GIS.lab Web plugin
 Publish your projects into GIS.lab Web application
 ***************************************************************************/
"""

def classFactory(iface):
    from webgisplugin import WebGisPlugin
    return WebGisPlugin(iface)
