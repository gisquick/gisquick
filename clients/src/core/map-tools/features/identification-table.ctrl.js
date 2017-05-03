(function() {
  'use strict';

  angular
    .module('gl.features')
    .controller('IdentificationTableController', IdentificationTableController);


  function IdentificationTableController($scope, $timeout, featuresViewer, infoPanel, tool) {
    $scope.tool = tool;

    function updateFeaturesTable() {
      tool.config.singleLayerResult = tool.config.identificationLayer !== '_all_';
      if (tool.data.activeLayer && tool.data.activeLayer.features.length > 0) {
        // stay on the same active layer, just check feature autoselection
        if (tool.config.featureAutoselect) {
          tool.data.activeLayer.selectedFeature = tool.data.activeLayer.features[0];
          featuresViewer.selectFeature(tool.data.activeLayer.selectedFeature);
        }
      } else {
        // try to find layer with some features
        var selectedLayer = tool.data.layers.find(function(layer) {
          return layer.features.length > 0;
        });
        if (selectedLayer) {
          var selectedLayerIndex = tool.data.layers.indexOf(selectedLayer);
          if (tool.data.activeLayerIndex !== selectedLayerIndex) {
            // set active layer immediately for info panel
            tool.data.activeLayer = tool.data.layers[selectedLayerIndex];
            // trigger new active tab selection
            $timeout(function() {
              tool.data.activeLayerIndex = selectedLayerIndex;
            });
          } else {
            $scope.setActiveLayer(selectedLayer);
          }
        } else {
          // no features at all
          tool.data.activeLayer = null;
          // featuresViewer.removeAllFeatures();
        }
      }
    }

    tool.events.featuresChanged = function() {
      updateFeaturesTable();
      if (infoPanel.isOpen()) {
        var layer = tool.data.activeLayer;
        if (layer) {
          infoPanel.show(layer.features[0], layer, $scope);
        } else {
          infoPanel.showEmpty();
        }
      }
    };

    $scope.setActiveLayer = function(layer) {
      if (layer.features.length === 0 || tool.data.activeLayer === layer) {
        // not valid active layer
        return;
      }
      featuresViewer.setActiveFeaturesLayer(layer.name);
      tool.data.activeLayer = layer;
      if (tool.config.featureAutoselect) {
        if (!layer.selectedFeature) {
          layer.selectedFeature = layer.features[0];
        }
        featuresViewer.selectFeature(layer.selectedFeature);
      }
    };

    $scope.selectFeature = function(feature) {
      featuresViewer.selectFeature(feature);
      tool.data.activeLayer.selectedFeature = feature;
    };


    $scope.showInfoPanel = function(feature) {
      infoPanel.show(feature, tool.data.activeLayer, $scope);
    }

    $scope.zoomToFeature = featuresViewer.zoomToFeature;

    $timeout(updateFeaturesTable);
  };
})();
