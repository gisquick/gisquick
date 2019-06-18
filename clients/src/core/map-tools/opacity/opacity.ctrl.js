(function() {
  'use strict';

  angular
    .module('gl.opacity')
    .controller('OpacityController', OpacityController);

  function OpacityController($scope, $timeout, projectProvider, layersControl, featuresViewer) {
    // console.log('OpacityController: INIT');
    $scope.tool.data.opacityValue = 100;
    var tool = $scope.tool;
    var qgislayer;

    $scope.changeOpacity = function() {
      qgislayer.setOpacity($scope.tool.data.opacityValue / 100);
    };

    $scope.tool.events.toolActivated = function() {
      qgislayer = projectProvider.map.getLayer('qgislayer');
      $scope.changeOpacity();  
    };

    $scope.tool.events.toolDeactivated = function() {
      qgislayer.setOpacity(1);
    };

  }
})();
