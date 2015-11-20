(function() {
  'use strict';

  angular
    .module('gl.layersControl')
    .factory('layersControl', [layersControl]);

  function layersControl() {
    function LayersControl() {};

    LayersControl.prototype.getVisibleBaseLayer = function(map) {
      var baseLayer;
      map.getLayers().forEach(function(layer) {
        if (layer.get('type') === 'baselayer' && layer.getVisible()) {
          baseLayer = layer;
        }
      });
      return baseLayer;
    };

    LayersControl.prototype.setBaseLayer = function(map, layername) {
      map.getLayers().forEach(function(layer) {
        if (layer.get('type') === 'baselayer') {
          if (layer.getVisible() && layer.get('name') !== layername) {
            layer.setVisible(false);
          }
          if (!layer.getVisible() && layer.get('name') === layername) {
            layer.setVisible(true);
          }
        }
      });
    };

    LayersControl.prototype.setVisibleLayers = function(map, visibleLayers) {
      var overlaysLayer = map.getLayer('qgislayer');
      if (overlaysLayer) {
        if (visibleLayers.length) {
          if (!overlaysLayer.getVisible()) {
            overlaysLayer.setVisible(true);
          }
        } else {
          overlaysLayer.setVisible(false);
        }
        overlaysLayer.getSource().setVisibleLayers(visibleLayers);
      }
    };

    LayersControl.prototype.getVisibleLayers = function(map) {
      var overlaysLayer = map.getLayer('qgislayer');
      if (overlaysLayer) {
        return overlaysLayer.getSource().getVisibleLayers();
      }
      return [];
    };

    return new LayersControl();
  };
})();
