(function() {
  'use strict';

  angular
    .module('gl.web')
    .controller('AppController', AppController);


  function AppController($scope, $timeout, staticResources, projectProvider, projectLoader,
                          gislabClient, glPanelManager, toolsManager) {
    $scope.staticResources = staticResources;
    $scope.ui = {
      manager: glPanelManager
    };
    $scope.Math = Math;

    $scope.secondaryMenuItems = [
      {
        title: 'Copyrights',
        checkbox: true,
        checked: false,
        perform: function() {
          var control = projectProvider.map.getControlByClass(ol.control.Attribution);
          var collapsed = !control.getCollapsed();
          control.setCollapsed(collapsed);
          this.checked = !collapsed;
        }
      }, {
        title: 'Help',
        perform: function() {
          setTimeout(function() { // run it outside Angular's digest cycle
            var width = parseInt(window.innerWidth * 0.65);
            var height = parseInt(window.innerWidth * 0.85);
            var left = parseInt((window.innerWidth - width) / 2);
            var windowParams =
              "left={0},width={1},height={2},resizable=yes,menubar=no,scrollbars=yes,status=no"
              .format(left, width, height);
            window.open(
              projectProvider.config.gislab_documentation,
              "GIS.lab Web Documentation",
              windowParams
            );
          });
        }
      }, {
        title: 'About'
      }
    ];

    function initializeProject(projectData) {
      $scope.title = projectData.root_title;
      $scope.showApp = true;
      projectData.rotateOptions = {
        target: 'map-rotate-reset',
        className: 'md-button map-button ol-rotate',
        label: document.getElementById('map-rotate-reset').children[0]
      };
      projectData.zoomOptions = {
        target: 'map-zoom-buttons',
        className: 'md-button map-button ol-zoom',
        zoomInLabel: document.getElementById('map-zoom-buttons').children[0],
        zoomOutLabel: document.getElementById('map-zoom-buttons').children[1]
      };
      projectData.attributionOptions = {
        target: document.getElementById('map-bottom-area')
      };

      projectProvider.load(projectData);
      if (projectProvider.map) {
        projectProvider.map.setTarget('map');
        projectProvider.map.updateSize();

        var scaleLine = new ol.control.ScaleLine({
          target: 'ol-scale-line-container'
        });
        projectProvider.map.addControl(scaleLine);
        $scope.project = projectProvider;

        glPanelManager.initialize({
          mainPanel: '#vertical-panel-container',
          statusBar: '#map-status-bar'
        });
        glPanelManager.showContentPanel({
          templateUrl: 'templates/tools/layers_control.html',
          parent: '#content-panel',
          scope: $scope
        });
        $timeout(function() {
          console.log('initializeProject:activateTool');
          toolsManager.activateTool(toolsManager.get('identification'));
          projectProvider.map.getView().fit(
            projectData.zoom_extent,
            projectProvider.map.getSize(),
            {
              padding: [0, 0, glPanelManager.mapView.bottom, glPanelManager.mapView.left]
            }
          );
        }, 2500);


        var preventNavigationHistorySave;
        var saveNavigationState = function() {
          var extent = projectProvider.map.getView().calculateExtent(projectProvider.map.getSize());
          if (preventNavigationHistorySave) {
            preventNavigationHistorySave = false;
          } else {
            var state = {
              center: projectProvider.map.getView().getCenter(),
              resolution: projectProvider.map.getView().getResolution(),
              rotation: projectProvider.map.getView().getRotation()
            };
            history.pushState(state, "");
          }
        };
        projectProvider.map.on('moveend', saveNavigationState);

        window.onpopstate = function(evt) {
          if (evt.state) {
            var map = projectProvider.map;
            var resolutionChanged = map.getView().getResolution() !== evt.state.resolution;
            var rotationChanged = map.getView().getRotation() !== evt.state.rotation;
            preventNavigationHistorySave = true;

            var pan = ol.animation.pan({
              duration: 300,
              source: map.getView().getCenter()
            });
            map.beforeRender(pan);

            if (resolutionChanged) {
              var zoom = ol.animation.zoom({
                duration: 300,
                resolution: map.getView().getResolution()
              });
              map.beforeRender(zoom);
            }

            if (rotationChanged) {
              var rotation = ol.animation.rotate({
                duration: 300,
                rotation: map.getView().getRotation()
              });
              map.beforeRender(rotation);
            }

            map.getView().setCenter(evt.state.center);
            if (resolutionChanged) {
              map.getView().setResolution(evt.state.resolution);
            }
            if (rotationChanged) {
              map.getView().setRotation(evt.state.rotation);
            }
          }
        };
      }
    }

    $scope.initializeApp = function() {
      if (projectLoader.projectData) {
        initializeProject(projectLoader.projectData);
      } else {
        projectLoader.once('projectLoaded', function(projectData) {
          initializeProject(projectData);
        });
      }
    };

    function setupScaleLabel() {
      var zoomListener = projectProvider.map.getView().on(
        'change:resolution',
        function(evt) {
          var scale = projectProvider.map.getView().getScale();
          $timeout(function() {
            $scope.mapScale = scale;
          });
        }
      );
      $scope.mapScale = projectProvider.map.getView().getScale();
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
      var scale = map.getSize()[0]/map.getTargetElement().getBoundingClientRect().width;
      var options = {
        padding: [
          glPanelManager.mapView.top*scale,
          glPanelManager.mapView.right*scale,
          glPanelManager.mapView.bottom*scale,
          glPanelManager.mapView.left*scale
        ]
      };
      projectProvider.map.fitAnimated(projectProvider.config.project_extent, options);
    };
  };
})();
