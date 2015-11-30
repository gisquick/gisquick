(function() {
  'use strict';

  angular
    .module('gl.mobile')
    .controller('SettingsController', SettingsController);

  function SettingsController($scope, projectProvider) {
    $scope.showHeaderChanged = function() {
      $scope.updateScreenSize();
    }
    $scope.showScaleLineChanged = function(value) {
      var control = projectProvider.map.getControlByClass(ol.control.ScaleLine);
      control.setMap(value? projectProvider.map : null);
    };
    $scope.showZoomControlsChanged = function(value) {
      var control = projectProvider.map.getControlByClass(ol.control.Zoom);
      control.setMap(value? projectProvider.map : null);
      var rotateControl = projectProvider.map.getControlByClass(ol.control.Rotate);
      if (value) {
        rotateControl.element.className = rotateControl.element.className.replace(' top', '');
      } else {
        rotateControl.element.classList.add('top');
      }
    };
  };
})();
