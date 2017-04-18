# -*- coding: utf-8 -*-
"""
/***************************************************************************
 Gisquick plugin
 Publish your projects into Gisquick application
 ***************************************************************************/
"""

def classFactory(iface):
    from webgisplugin import WebGisPlugin
    return WebGisPlugin(iface)
