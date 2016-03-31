(function() {
  'use strict';

  angular
    .module('gl.legend')
    .controller('LegendController', LegendController);

  function LegendController($scope, $timeout, projectProvider) {
    $scope.layers = projectProvider.layers;

    function updateLegendUrls () {
      var layerSource = projectProvider.map.getLayer('qgislayer').getSource();
      var view = projectProvider.map.getView();
      var mapScale = view.getScale();
      $scope.layers.list.forEach(function(layer_data) {
        if ((!layer_data.visibility_scale_max || mapScale <= layer_data.visibility_scale_max)
          && (!layer_data.visibility_scale_min || mapScale >= layer_data.visibility_scale_min)) {
          layer_data.legendUrl = layerSource.getLegendUrl(layer_data.name, view);
        } else {
          // hide legend when layer is out of scale visibility range
          layer_data.legendUrl = '';
        }
        //+'&BBOX='+projectProvider.map.getView().calculateExtent(projectProvider.map.getSize()).join(',')+'&SRS='+projectProvider.map.getView().getProjection().getCode();
      });
    }

    var zoomListener;
    $scope.activateLegend = function() {
      if (projectProvider.map) {
        updateLegendUrls();
        zoomListener = projectProvider.map.getView().on('change:resolution', function() {
          console.log('Zoom changed...');
          $timeout(function() {
            updateLegendUrls();
          });
        });
      }
    }

    $scope.deactivateLegend = function() {
      if (zoomListener) {
        projectProvider.map.getView().unByKey(zoomListener);
        zoomListener = null;
      }
    }
  };
})();
