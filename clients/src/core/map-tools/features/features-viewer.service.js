(function() {
  'use strict';

  angular
    .module('gl.features')
    .factory('featuresViewer', featuresViewer);


  function featuresViewer(projectProvider) {

    function FeaturesViewer() {
      console.log('FeaturesViewer: INIT');
      this.featuresLayers = {};
      this.layersAttributes = {};
      this.selectionControls = {};
      this.selectControl;
    }

    FeaturesViewer.prototype.initialize = function() {
      /* Collect info about layer attributes (aliases) */
      this.layersAttributes = {};
      projectProvider.layers.list.forEach(function(layer) {
        if (layer.queryable) {
          var attributes = [];
          if (layer.attributes) {
            layer.attributes.forEach(function(attr) {
              attributes.push({
                name: attr.name,
                label: attr.alias || attr.name,
                type: attr.type
              });
            });
          }
          this.layersAttributes[layer.name] = attributes;
        }
      }, this);
      // clean previous vector layers and selection controls
    }

    FeaturesViewer.prototype.getLayerAttributes = function(layername) {
      return this.layersAttributes[layername];
    }

    FeaturesViewer.prototype.getVectorLayer = function(layername) {
      if (this.featuresLayers[layername]) {
        return this.featuresLayers[layername];
      }

      var vectorLayer = projectProvider.map.getLayer(layername);
      if (!vectorLayer) {
        console.log('createVectorLayer: '+layername);
        vectorLayer = new ol.layer.Vector({
          source: new ol.source.Vector({
            //projection: ol.proj.get('EPSG:4326')
          }),
          style: new ol.style.Style({
            stroke: new ol.style.Stroke({
              color: [250, 250, 25, 0.8],
              width: 2
            }),
            fill: new ol.style.Fill({
              color: [250, 250, 25, 0.5]
            }),
            image: new ol.style.Circle({
              stroke: new ol.style.Stroke({
                color: [250, 250, 25, 0.8],
                width: 2
              }),
              fill: new ol.style.Fill({
                color: [250, 250, 25, 0.5]
              }),
              radius: 5
            }),
          }),
          visible: false
        });
        vectorLayer.set('name', layername);
        projectProvider.map.addLayer(vectorLayer);
      }
      this.featuresLayers[layername] = vectorLayer;
      return vectorLayer;
    }

    FeaturesViewer.prototype.getLayerSelectionControl = function(layername) {
      if (this.selectionControls[layername]) {
        return this.selectionControls[layername];
      }
      var selectControl = new ol.interaction.Select({
        condition: ol.events.condition.never,
        layers: [this.featuresLayers[layername]],
        style: new ol.style.Style({
          stroke: new ol.style.Stroke({
            color: [102, 204, 204, 0.8],
            width: 3
          }),
          fill: new ol.style.Stroke({
            color: [102, 204, 204, 0.5],
          }),
          image: new ol.style.Circle({
            stroke: new ol.style.Stroke({
              color: [102, 204, 204, 0.8],
              width: 2
            }),
            fill: new ol.style.Fill({
              color: [102, 204, 204, 0.5],
            }),
            radius: 5
          }),
        })
      });
      this.selectionControls[layername] = selectControl;
      projectProvider.map.addInteraction(selectControl);
      return selectControl;
    };

    FeaturesViewer.prototype.selectFeature = function(feature) {
      this.selectControl.getFeatures().clear();
      if (feature) {
        this.selectControl.getFeatures().push(feature);
      }
    };

    FeaturesViewer.prototype.zoomToFeature = function(feature) {
      var map = projectProvider.map;
      var pan = ol.animation.pan({
        duration: 300,
        source: map.getView().getCenter()
      });
      var zoom = ol.animation.zoom({
        duration: 300,
        resolution: map.getView().getResolution()
      });
      map.beforeRender(pan, zoom);
      if (feature.getGeometry().getType() === 'Point') {
        console.log(feature.getGeometry().getCoordinates());
        map.getView().setCenter(feature.getGeometry().getCoordinates());
      } else {
        // ol.extent.buffer could be used
        var extent = feature.getGeometry().getExtent();
        map.getView().fit(extent, map.getSize());
      }
    };

    FeaturesViewer.prototype.getFeatureAttributes = function(layername) {
      var layerAttrs = this.layersAttributes[layername];
      var attributes = [];
      for (var attrName in layerAttrs) {
        attributes.push({
          name: attrName,
          label: layerAttrs[attrName].alias || attrName
        });
      }
      return attributes;
    };

    FeaturesViewer.prototype.setActiveFeaturesLayer = function(layername) {
      console.log('setActiveFeaturesLayer: '+layername);
      var vectorLayer = this.getVectorLayer(layername);
      for (var lname in this.featuresLayers) {
        this.featuresLayers[lname].setVisible(lname === layername);
      }

      this.selectControl = this.getLayerSelectionControl(layername);
      for (var lname in this.selectionControls) {
        this.selectionControls[lname].setActive(lname === layername);
        this.selectionControls[lname].setMap(lname === layername? projectProvider.map: null);
      }
    };

    FeaturesViewer.prototype.setLayersFeatures = function(layersFeatures) {
      console.log('FeaturesViewer.setLayersFeatures');
      // clear prevoius selection
      if (this.selectControl) {
        this.selectControl.getFeatures().clear();
      }
      for (var layername in this.featuresLayers) {
        //this.featuresLayers[layername].getSource().clear();
      }

      if (layersFeatures) {
        for (var layername in layersFeatures) {
          var vectorLayer = this.getVectorLayer(layername);
          vectorLayer.getSource().clear();
          vectorLayer.getSource().addFeatures(layersFeatures[layername]);
        }
      }
    };
    return new FeaturesViewer();
  };
})();
