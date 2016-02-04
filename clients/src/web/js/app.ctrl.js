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

  function AppController($scope, $timeout, $q, projectProvider, glPanelService) {
    $scope.ui = {
      mapView: {
        left: 280,
        bottom: 0
      },
      panel: glPanelService
    };
    $scope.activeTool = {index:  0, deactivate: angular.noop};
    $scope.tools = [
      {
        name: 'identification',
        title: 'Identification',
        index: 0,
        tooltip: 'Identify features by mouse click',
        icon: 'circle-i',
        template: 'templates/tools/identification/form.html',
        config: {
          markerIcon: 'plus',
          identificationLayer: '',
          rowsPerPage: 5,
          limit: 10,
          featureAutoselect: false
        },
        data: {
          /**
          Data structure for all queryable layers with matched features data.
          Attributes:
            name: 'layername'
            attributes: []
            features: []
            selectedFeature: null
            page: 1
          */
          layers: [],
          activeLayer: null,
          activeLayerIndex: null
        },
        events: {
          featuresChanged: angular.noop,
          toolActivated: angular.noop,
          toolDeactivated: angular.noop
        },
        showTable: function(layersFeatures) {
          if (!this.resultsScope) {
            this.resultsScope = $scope.$new();
            var tool = this;
            var panelPromise = glPanelService.showPanel({
              layout: {
                vertical: {
                  templateUrl: 'templates/tools/identification/list_table.html',
                  parent: '#vertical-identification-table',
                  header: '#vertical-identification-table-header'
                },
                horizontal: {
                  templateUrl: 'templates/tools/identification/table.html',
                  parent: '.bottom-bar'
                }
              },
              scope: this.resultsScope,
              controller: 'IdentificationTableController',
              locals: {tool: tool}
            });
            // when identification's attribute table is closed
            // by calling 'hide' method
            panelPromise.then(function() {
              console.log('IDENTIFICATION TABLE CLOSED');
              if ($scope.activeTool === tool) {
                $scope.deactivateTool();
              }
            });
            // when identification's attribute table is closed by draging down
            panelPromise.catch(function() {
              $scope.deactivateTool();
            });
            tool.panelPromise = panelPromise;
          } else {
            this.events.featuresChanged();
          }
        },
        activate: function() {
          this.resultsScope = null;
          this.events.toolActivated();
        },
        deactivate: function() {
          glPanelService.hidePanel();
          this.events.toolDeactivated();
        }
      }, {
        name: 'measure',
        title: 'Measure',
        index: 1,
        tooltip: 'Mesure ...',
        icon: 'ruler',
        markerIcon: 'plus',
        template: 'templates/tools/measure.html',
        activate: function() {
          if (angular.isFunction(this.onActivated)) {
            this.onActivated();
          };
        },
        deactivate: function() {
          if (angular.isFunction(this.onDeactivated)) {
            this.onDeactivated();
          };
        }
      }, {
        name: 'print',
        index: 2,
        title: 'Print',
        tooltip: 'Print output creation',
        icon: 'printer',
        template: 'templates/tools/print.html',
        config: {
          dpi: 96,
          format: 'png',
          rotation: 0
        },
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
      console.log('activateTool: '+tool.name);
      if ($scope.activeTool) {
        $scope.activeTool.deactivate();
      }
      $scope.activeTool = tool;
      $scope.activeTool.activate();
      $timeout(function() {
        glPanelService.showToolsPanel();// TODO: add delay param
      }, 700);
    };

    $scope.deactivateTool = function() {
      console.log('deactivateTool');
      if ($scope.activeTool) {
        $scope.activeTool.deactivate();
        $scope.activeTool = null;
        //$scope.ui.panelTop.flex = 'auto';
      }
      glPanelService.hideToolsPanel();
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

          glPanelService.initializePanel(angular.element(
            document.getElementById('vertical-panel-container')
          ));
          glPanelService.loadToolsPanel({
            templateUrl: 'tools_panel.html',
            parent: '#tools-panel',
            scope: $scope.$new()
          });
          glPanelService.showContentPanel({
            templateUrl: 'templates/tools/layers_control.html',
            parent: '#content-panel',
            scope: $scope
          });
          $timeout(function() {
            $scope.activateTool($scope.tools.get('identification'));
          }, 2500);
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

    $scope.zoomToMaxExtent = function() {
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
      map.getView().fit(projectProvider.config.project_extent, map.getSize());
    };
  };
})();
