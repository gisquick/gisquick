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

    function initializeTools() {
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
          initialize: angular.noop,
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
          icon: 'ruler',
          tooltip: 'Mesure coordinates, length and area',
          template: 'templates/tools/measure.html',
          config: {
            positionUnits: undefined, // define in initialization function
            lengthUnits: [
              {
                name: '',
                title: 'Automatic'
              }, {
                name: 'm',
                label: 'm',
                title: 'Meters (m)'
              }, {
                name: 'km',
                label: 'km',
                title: 'Kilometers (km)'
              }, {
                name: 'mi',
                label: 'mi',
                title: 'Miles (mi)'
              }
            ],
            areaUnits: [
              {
                name: '',
                title: 'Automatic'
              }, {
                name: 'm2',
                label: 'm²',
                title: 'Square meters (m²)'
              }, {
                name: 'km2',
                label: 'km²',
                title: 'Square kilometers (km²)'
              }, {
                name: 'ha',
                label: 'ha',
                title: 'Hectares (ha)'
              }, {
                name: 'a',
                label: 'a',
                title: 'Ares (a)'
              }
            ],
            position: {
              unitsIndex: 0
            },
            length: {
              unitsIndex: 0
            },
            area: {
              perimeterUnitsIndex: 0,
              areaUnitsIndex: 0
            }
          },
          data: {
            position: [],
            length: {
              total: '',
              lastSegment: ''
            },
            area: ''
          },
          events: {
            toolActivated: angular.noop,
            toolDeactivated: angular.noop,
            unitsChanged: angular.noop
          },
          initialize: function() {
            this.config.positionUnits = [];
            var mapProjection = projectProvider.map.getView().getProjection();
            if (mapProjection.getCode() !== 'EPSG:4326') {
              this.config.positionUnits.push(
                {
                  name: projectProvider.config.projection.code,
                  title: '{0} ({1})'.format(
                    projectProvider.config.projection.code,
                    mapProjection.getUnits()
                  ),
                  projection: mapProjection,
                  label: mapProjection.getUnits(),
                  decimalPlaces: projectProvider.config.position_precision.decimal_places
                }
              );
            }
            this.config.positionUnits.push(
              {
                name: 'EPSG:4326',
                title: 'EPSG:4326 (degrees)',
                projection: ol.proj.get('EPSG:4326'),
                label: '°',
                decimalPlaces: 6
              }, {
                name: 'EPSG:4326_HDMS',
                title: 'EPSG:4326 (HDMS)',
                projection: ol.proj.get('EPSG:4326'),
                label: '' // unit label is encoded in value
              }
            );
          },
          activate: function() {
            this.events.toolActivated();
          },
          deactivate: function() {
            this.events.toolDeactivated();
          }
        }, {
          name: 'print',
          index: 2,
          title: 'Print',
          tooltip: 'Print output creation',
          icon: 'printer',
          template: 'templates/tools/print.html',
          previewTemplate: 'templates/tools/print_preview.html',
          config: {
            layouts: undefined, // define in initialization function
            dpi: 96,
            format: 'png',
            rotation: 0,
            title: projectProvider.config.root_title,
            author: 'User',
            contact:
              '<div style="position:absolute;bottom:0;right:0;font-family:Liberation Sans;">\
                <span>{0}<br />{1}</span>\
              </div>'.format(projectProvider.config.organization, projectProvider.config.email)
          },
          events: {
            toolActivated: angular.noop,
            toolDeactivated: angular.noop,
            layoutChanged: angular.noop
          },
          initialize: function() {
            // sort layouts by height
            var layouts = projectProvider.config.print_composers.sort(function(a, b) {
              return a.height > b.height;
            });
            this.config.layouts = layouts;
            // select default layout
            this.config.layout = layouts[0];
          },
          activate: function() {
            this.events.toolActivated();
          },
          deactivate: function() {
            this.events.toolDeactivated();
          }
        }
      ];
      $scope.tools.forEach(function(tool) {
        tool.initialize();
      });
      $scope.tools.get = function(name) {
        for (var i = 0; i < this.length; i++) {
          if (this[i].name === name) {
            return this[i];
          }
        }
      };
    }

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
      if ($scope.ui.mapView.left === 0) {
        $scope.ui.mapView.left = 280;
      }
    };

    $scope.deactivateTool = function() {
      console.log('deactivateTool');
      if ($scope.activeTool) {
        $scope.activeTool.deactivate();
        $scope.activeTool = null;
      }
      glPanelService.hideToolsPanel();
    };

    $scope.initializeApp = function() {
      webgis.project.then(function(projectData) {
        $scope.title = webgis.project.root_title;
        console.log(projectData);

        projectData.rotateOptions = {
          target: 'map-rotate-reset',
          label: document.getElementById('map-rotate-reset').children[0]
        };
        projectData.zoomOptions = {
          target: 'map-zoom-buttons',
          zoomInLabel: document.getElementById('map-zoom-buttons').children[0],
          zoomOutLabel: document.getElementById('map-zoom-buttons').children[1]
        };
        projectData.attributionOptions = {
          target: document.getElementById('map-attributions'),
          collapsible: true,
          label: '©'
        };

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

          initializeTools();
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
        coordinateFormat: ol.coordinate.createStringXY(
          projectProvider.config.position_precision.decimal_places
        ),
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
