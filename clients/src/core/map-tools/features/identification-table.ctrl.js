(function() {
  'use strict';

  angular
    .module('gl.features')
    .controller('IdentificationTableController', IdentificationTableController);

  function IdentificationTableController($scope, featuresViewer, tool) {
    $scope.tool = tool;

    $scope.setActiveLayer = function(layer) {
      console.log('SET ACTIVE LAYER', layer.name);
      featuresViewer.setActiveFeaturesLayer(layer.name);
      $scope.activeLayer = layer;
    };

    $scope.selectFeature = function(feature) {
      featuresViewer.selectFeature(feature);
      $scope.selectedFeature = feature;
    };

    $scope.zoomToFeature = function(feature) {
      //$scope.selectFeature(feature);
      console.log($scope);
      featuresViewer.zoomToFeature(
        feature,
        {padding: [100, 100, 100, 200]}
      );
    }

  };
})();
