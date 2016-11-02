#/***************************************************************************
# GIS.lab Web plugin
# Publish your projects into GIS.lab Web application
# ***************************************************************************/

# WARNING: Every line in Makefile recipe must begin with a tab character. Don't
#          try to convert them spaces !

QGISDIR = .qgis2
GISLAB_BUILDDIR = build
PLUGINNAME = gislab_web
PY_FILES = webgisplugin.py wizard.py project.py topics.py confirmation.py publish.py utils.py __init__.py
EXTRAS = icon.png metadata.txt
UI_FILES = publish_dialog.ui
RESOURCE_FILES = resources_rc.py
ZIPNAME = gislab-web-qgis
VERSION := $(shell grep version metadata.txt | awk -F "=" '{print $$2}')


default: compile

compile: $(RESOURCE_FILES)

%_rc.py : %.qrc
	pyrcc4 -o $*_rc.py  $<

# The deploy target only works on unix like operating system where the Python
# plugin directory is located at "$HOME/$(QGISDIR)/python/plugins"
deploy: compile
	mkdir -p $(HOME)/$(QGISDIR)/python/plugins/$(PLUGINNAME)
	cp -vf $(PY_FILES) $(HOME)/$(QGISDIR)/python/plugins/$(PLUGINNAME)
	cp -vf $(UI_FILES) $(HOME)/$(QGISDIR)/python/plugins/$(PLUGINNAME)
	cp -vf $(RESOURCE_FILES) $(HOME)/$(QGISDIR)/python/plugins/$(PLUGINNAME)
	cp -vf $(EXTRAS) $(HOME)/$(QGISDIR)/python/plugins/$(PLUGINNAME)

# The derase deletes deployed plugin
derase:
	rm -Rf $(HOME)/$(QGISDIR)/python/plugins/$(PLUGINNAME)

# The zip target creates a zip file with the deployed content.
zip:
	rm -f $(ZIPNAME)*.zip
	rm -Rf $(GISLAB_BUILDDIR)
	mkdir -p $(GISLAB_BUILDDIR)/$(PLUGINNAME)
	cp -vf $(PY_FILES) $(GISLAB_BUILDDIR)/$(PLUGINNAME)
	cp -vf $(UI_FILES) $(GISLAB_BUILDDIR)/$(PLUGINNAME)
	cp -vf $(RESOURCE_FILES) $(GISLAB_BUILDDIR)/$(PLUGINNAME)
	cp -vf $(EXTRAS) $(GISLAB_BUILDDIR)/$(PLUGINNAME)
	cd $(GISLAB_BUILDDIR); zip -9r $(CURDIR)/$(ZIPNAME)-$(VERSION).zip $(PLUGINNAME)
	rm -Rf $(GISLAB_BUILDDIR)

clean:
	rm $(RESOURCE_FILES)
