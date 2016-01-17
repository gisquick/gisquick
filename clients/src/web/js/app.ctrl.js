(function() {
  'use strict';

  angular
    .module('gl.web')
    .controller('AppController', AppController)
    .factory('staticResource', function(staticRoot) {
      return function(filename) {
        return staticRoot+filename;
      }
    });

  function AppController($scope, $timeout, $q, projectProvider, $mdBottomSheet) {
    $scope.ui = {
      toolPanelOpen: true,

      mapView: {
        left: 280,
        bottom: 0
      }
    };
    $scope.activeTool = {index:  1, deactivate: angular.noop};
    $scope.tools = [
      // {
      //   title: 'Zoom to max extent',
      //   icon: 'zoom-max',
      //   action: function() {
      //     var map = projectProvider.map;
      //     var pan = ol.animation.pan({
      //       duration: 300,
      //       source: map.getView().getCenter()
      //     });
      //     var zoom = ol.animation.zoom({
      //       duration: 300,
      //       resolution: map.getView().getResolution()
      //     });
      //     map.beforeRender(pan, zoom);
      //     map.getView().fit(projectProvider.config.project_extent, map.getSize());
      //   }
      // }, 
      {
        name: 'identification',
        title: 'Identification',
        tooltip: 'Identify features by mouse click',
        icon: 'circle-i',
        index: 0,
        rowsPerPage: 5,
        limit: 10,
        template: 'templates/tools/identification.html',
        markerIcon: 'plus',
        activate: function() {
          var tool = this;
          tool.collapsed = true;
          var sheetPromise = $mdBottomSheet.show({
            templateUrl: 'templates/tools/identification_table.html',
            clickOutsideToClose: false,
            disableParentScroll: false,
            parent: '.bottom-bar',
            controller: 'IdentificationController',
            locals: {tool: tool}
          });
          // when identification's attribute table is closed
          // by $mdBottomSheet.hide
          sheetPromise.then(function() {
            if ($scope.activeTool === tool) {
              $scope.deactivateTool();
            }
          });
          // when identification's attribute table is closed by draging down
          sheetPromise.catch(function() {
            $scope.deactivateTool();
          });
        },
        deactivate: function() {
          $mdBottomSheet.hide();
        }
      }, {
        title: 'Measure',
        index: 1,
        tooltip: 'Mesure ...',
        icon: 'ruler',
        disabled: true,
        template: 'templates/tools/measure.html',
        activate: angular.noop,
        deactivate: angular.noop
      }, {
        name: 'print',
        index: 2,
        title: 'Print',
        tooltip: 'Print output creation',
        icon: 'printer',
        disabled: true,
        activate: angular.noop,
        deactivate: angular.noop
      }
    ];
    $scope.tools.get = function(name) {
      for (var i = 0; i < this.length; i++) {
        if (this[i].name === name) {
          return this[i];
        }
      }
    };

    $scope.activateTool = function(tool) {
      if ($scope.activeTool) {
        $scope.activeTool.deactivate();
      }
      $scope.activeTool = tool;
      $scope.activeTool.activate();
      //$scope.ui.panelTop.flex = 'auto';
      //$scope.ui.toolPanelOpen = true;
      $timeout(function() {
        $scope.ui.toolPanelOpen = true;
      }, 650);
    };

    $scope.deactivateTool = function() {
      console.log('deactivateTool');
      if ($scope.activeTool) {
        $scope.activeTool.deactivate();
        $scope.activeTool = null;
        //$scope.ui.panelTop.flex = 'auto';
      }
      $scope.ui.toolPanelOpen = false;
    };

    $scope.initializeApp = function() {
      webgis.project.then(function(projectData) {
        $scope.title = webgis.project.root_title;
        console.log(projectData);
        projectProvider.load(projectData);
        if (projectProvider.map) {
          projectProvider.map.setTarget('map');
          projectProvider.map.updateSize();
          var size = projectProvider.map.getSize();
          projectProvider.map.getView().fit(projectData.zoom_extent, size);
          var scaleLine = new ol.control.ScaleLine({
            target: 'ol-scale-line-container'
          });
          projectProvider.map.addControl(scaleLine);
          $scope.project = projectProvider;
          $scope.activateTool($scope.tools.get('identification'));
        }
      });
    };

    function setupScaleLabel() {
      var scalesCache = {};
      function resolutionToScale(resolution) {
        var scale = scalesCache[resolution];
        if (!scale) {
          var index = projectProvider.config.tile_resolutions.findIndex(
            function(r) {
              return Math.abs(r-resolution) < 0.001;
            }
          );
          scale = projectProvider.config.scales[index];
          scalesCache[resolution] = scale;
        }
        return scale;
      }
      var zoomListener = projectProvider.map.getView().on(
        'change:resolution',
        function(evt) {
          var resolution = evt.target.get(evt.key);
          var scale = resolutionToScale(resolution);
          $timeout(function() {
            $scope.mapScale = scale;
          });
        }
      );
      $scope.mapScale = resolutionToScale(projectProvider.map.getView().getResolution());
    }
    $scope.initializeStatusBar = function() {
      setupScaleLabel();
      var positionControl = new ol.control.MousePosition({
        coordinateFormat: ol.coordinate.createStringXY(4),
        target: 'ol-mouse-position-container'
      });
      projectProvider.map.addControl(positionControl);
    };
  };
})();
