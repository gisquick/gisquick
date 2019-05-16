(function() {
  'use strict';

  angular
    .module('gl.opacity')
    .controller('OpacityController', OpacityController);

  function OpacityController($scope, $timeout, projectProvider, layersControl, featuresViewer) {
    console.log('OpacityController: INIT');
    var tool = $scope.tool;
    var layerName;

    $scope.tool.events.toolActivated = function() {
      $scope.setLayer(); 
    }

    $scope.setLayer = function() {
      layerName = $scope.tool.config.opacityLayer === '_all_' ?
        layersControl.getVisibleLayers(projectProvider.map).join(",") :
        $scope.tool.config.opacityLayer;
    }

    $scope.changeOpacity = function() {
      // console.log(layerName);
      // console.log($scope.tool.data.opacityValue)
    }

  }
})();
