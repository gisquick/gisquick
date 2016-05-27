(function() {
  'use strict';

  angular
    .module('gl.legend')
    .controller('LegendController', LegendController)

    .directive('imageLoad', function($parse) {
      return {
        restrict: 'A',
        link: function (scope, elem, attrs) {
          var fn = $parse(attrs.imageLoad);
          elem.on('load', function (event) {
            scope.$apply(function() {
              fn(scope, { $event: event });
            });
          });
        }
      };
    })
    .directive('imageLoadError', function($parse) {
      return {
        restrict: 'A',
        link: function (scope, elem, attrs) {
          var fn = $parse(attrs.imageLoadError);
          elem.on('error', function (event) {
            scope.$apply(function() {
              fn(scope, { $event: event });
            });
          });
        }
      };
    });

  function LegendController($scope, $timeout, $q, projectProvider) {
    $scope.layers = projectProvider.layers;

    var legendUpdateTask, loadingLegendsList, downloadedLegendsList;
    function updateLegendUrls () {
      loadingLegendsList = [];
      downloadedLegendsList = [];
      var layerSource = projectProvider.map.getLayer('qgislayer').getSource();
      var view = projectProvider.map.getView();
      var mapScale = view.getScale();
      $scope.layers.list.forEach(function(layer_data) {
        if (layer_data.visible) {
          if (
              (!layer_data.visibility_scale_max || mapScale <= layer_data.visibility_scale_max) &&
              (!layer_data.visibility_scale_min || mapScale >= layer_data.visibility_scale_min)
            ) {
            var legendUrl = layerSource.getLegendUrl(layer_data.name, view);
            if (layer_data.legendUrl !== legendUrl) {
              layer_data.legendUrl = legendUrl;
              loadingLegendsList.push(layer_data.legendUrl);
            }
          } else {
            // hide legend when layer is out of scale visibility range
            layer_data.legendUrl = '';
          }
          //+'&BBOX='+projectProvider.map.getView().calculateExtent(projectProvider.map.getSize()).join(',')+'&SRS='+projectProvider.map.getView().getProjection().getCode();
        }
      });
      if (loadingLegendsList.length) {
        // use a little timeout to prevent displaying progressbar
        // when images are already cached by browser
        $timeout(function() {
          if (loadingLegendsList.length !== downloadedLegendsList.length) {
            legendUpdateTask = $q.defer();
            $scope.legendProgressBar = legendUpdateTask.promise;
          }
        }, 100);
      }
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

    $scope.imageLoadingFinished = function(layer) {
      downloadedLegendsList.push(layer.legendUrl);

      // List of remaining legend images (for debugging)
      // var remaining = [];
      // loadingLegendsList.forEach(function(item) {
      //   if (downloadedLegendsList.indexOf(item) === -1) {
      //     remaining.push(item.substring(item.indexOf('LAYER=')+6).split('&')[0].replace('%20', ' '));
      //   }
      // });
      // console.log('remaining: '+remaining);

      var pendingLegends = loadingLegendsList.some(function(url) {
        return downloadedLegendsList.indexOf(url) === -1;
      });
      if (!pendingLegends) {
        legendUpdateTask.resolve();
      }
    };

  };
})();
