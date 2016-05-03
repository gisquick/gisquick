(function() {
  'use strict';

  angular
    .module('gl.web')
    .controller('AppController', AppController);


  function AppController($scope, $timeout, $q, $mdDialog, $mdToast,
    projectProvider, glPanelManager, gislabClient, staticResources,
    projectLoader, locationService) {
    $scope.staticResources = staticResources;
    $scope.ui = {
      manager: glPanelManager
    };
    $scope.Math = Math;
    $scope.activeTool = {index:  0, deactivate: angular.noop};

    $scope.fullScreenTool = {
      title: 'Fullscreen',
      active: false,
      _fullscreenChange: function(evt) {
        var tool = this;
        var fullscreen = document.webkitIsFullScreen || document.mozFullScreen;
        if (tool.active && !fullscreen) {
          tool.active = false;
        }
      },
      _keyListener: function(evt) {
        var tool = this;
        // handle F11 key to 'replace' default (browser's) full screen mode
        // with custom full screen
        if (evt.code === "F11") {
          evt.preventDefault();
          evt.stopPropagation();
          tool.toggle();
        }
      },
      initialize: function() {
        this._keyListener = this._keyListener.bind(this);
        this._fullscreenChange = this._fullscreenChange.bind(this);
        document.addEventListener("keydown", this._keyListener);
        document.addEventListener("fullscreenchange", this._fullscreenChange);
        document.addEventListener("mozfullscreenchange", this._fullscreenChange);
        document.addEventListener("webkitfullscreenchange", this._fullscreenChange);
      },
      destroy: function() {
        document.removeEventListener("keydown", this._keyListener);
        document.removeEventListener("fullscreenchange", this._fullscreenChange);
        document.removeEventListener("mozfullscreenchange", this._fullscreenChange);
        document.removeEventListener("webkitfullscreenchange", this._fullscreenChange);
      },
      toggle: function() {
        if (this.active) {
          var fullscreenExitFn = document.mozCancelFullScreen || document.webkitCancelFullScreen;
          fullscreenExitFn.bind(document)();
          this.title = 'Full Screen';
        } else {
          var elem = document.body;
          var fullscreenFn = elem.mozRequestFullScreen || elem.webkitRequestFullscreen;
          fullscreenFn.bind(elem)();
          this.title = 'Exit Full Screen';
        }
        this.active = !this.active;
      }
    };
    $scope.fullScreenTool.initialize();

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

    function initializeTools() {
      console.log(projectProvider);
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
            singleLayerResult: false,
            rowsPerPage: 5,
            limit: 10,
            featureAutoselect: false,
            mapView: glPanelManager.mapView
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
              var panelPromise = glPanelManager.showPanel({
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
            glPanelManager.hidePanel();
            this.events.toolDeactivated();
          }
        }, {
          name: 'measure',
          title: 'Measure',
          index: 1,
          icon: 'ruler',
          tooltip: 'Mesure coordinates, length and area',
          template: 'templates/tools/measure.html',
          convertLength: function(value, unit) {
            return value * 1 / unit.meters;
          },
          convertArea: function(value, unit) {
            return value * 1 / unit.squareMeters;
          },
          config: {
            positionUnits: undefined, // define in initialization function
            unitsSystems: [
              {
                title: 'International - EU',
                lengthUnits: [
                  {
                    title: 'Meters (m)',
                    label: 'm',
                    meters: 1,
                    maxValue: 1000
                  }, {
                    title: 'Kilometers (km)',
                    label: 'km',
                    meters: 1000
                  }
                ],
                areaUnits: [
                  {
                    title: 'Square meters (m²)',
                    label: 'm²',
                    squareMeters: 1,
                    maxValue: 1000000
                  }, {
                    title: 'Square kilometers (km²)',
                    label: 'km²',
                    squareMeters: 1000000
                  }, {
                    title: 'Hectares (ha)',
                    label: 'ha',
                    squareMeters: 10000
                  }
                ],
                lengthAutoUnits: ['m', 'km'],
                areaAutoUnits: ['m²', 'km²']
              }, {
                title: 'Imperial - UK, US',
                lengthUnits: [
                  {
                    title: 'Yards (yd)',
                    label: 'yd',
                    meters: 0.9144,
                    maxValue: 1760
                  }, {
                    title: 'Miles (mi)',
                    label: 'mi',
                    meters: 1609.344
                  }
                ],
                areaUnits: [
                  {
                    title: 'Square yards (sq. yd.)',
                    label: 'sq. yd.',
                    squareMeters: 0.83612736,
                    maxValue: 4840
                  }, {
                    title: 'Acre',
                    label: 'acre',
                    squareMeters: 4046.8564224
                  }
                ],
                lengthAutoUnits: ['yd', 'mi'],
                areaAutoUnits: ['sq. yd.', 'acre']
              }
            ],
            positionUnitsIndex: 0,
            unitsSystemIndex: 0,
            lengthUnitIndex: 'auto',
            areaUnitIndex: 'auto',
            // arrays of selected length/area units - more suitable unit will be selected
            // from this array depending of 'maxValue' attribute in unit definition
            lengthUnits: null,
            areaUnits: null
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
          disabled: !(projectProvider.config.print_composers && projectProvider.config.print_composers.length),
          template: 'templates/tools/print.html',
          previewTemplate: 'templates/tools/print_preview.html',
          config: {
            previewParentElement: projectProvider.map.getTargetElement().parentElement,
            layouts: undefined, // define in initialization function
            dpi: 96,
            format: 'png',
            rotation: 0,
            title: projectProvider.config.root_title,
            author: gislabClient.userInfo.full_name,
            screenSize: [0, 0], // available screen size for print preview
            contact:
              '<div style="position:absolute;bottom:0;right:0;font-family:Liberation Sans;">\
                <span>{0}<br />{1}</span>\
              </div>'.format(projectProvider.config.organization, projectProvider.config.email)
          },
          data: {},
          events: {
            toolActivated: angular.noop,
            toolDeactivated: angular.noop,
            layoutChanged: angular.noop
          },
          initialize: function() {
            if (!projectProvider.config.print_composers) {
              return;
            }
            // sort layouts by height
            var layouts = projectProvider.config.print_composers.sort(function(a, b) {
              return a.height > b.height;
            });
            this.config.layouts = layouts;
            // select default layout
            this.config.layout = layouts[0];
            this.config.layouts.forEach(function(layout) {
              var labelsData = [];
              layout.labels.forEach(function(label) {
                if (!label.startsWith('gislab_')) {
                  labelsData.push({
                    title: label,
                    value: ''
                  });
                }
              });
              this.data[layout.name] = {labels: labelsData};
            }, this);
          },
          _moveMap: function(offsetX) {
            var resolution = projectProvider.map.getView().getResolution();
            var center = projectProvider.map.getView().getCenter();
            var mapSize = projectProvider.map.getSize();
            var pan = ol.animation.pan({
              duration: 450,
              source: center,
              easing: ol.easing.inAndOut
            });

            projectProvider.map.beforeRender(pan);
            projectProvider.map.getView().setCenter([
              center[0]+resolution*offsetX*mapSize[0]/window.innerWidth,
              center[1]
            ]);
          },
          mapResizeListener: function(mapView) {
            var currentScale = this.config._previewScale;
            if (mapView.left !== this.config._left) {
              if (mapView.left < this.config._left) {
                var offset = (this.config._left-mapView.left)/2;
                this._moveMap(offset);
              }
            }

            this.config.screenSize[0] = window.innerWidth-mapView.right-mapView.left-100;
            this.config.screenSize[1] = window.innerHeight-50;
            this.events.mapResized();

            if (mapView.left > this.config._left) {
              var offset = (this.config._left-mapView.left)/2;
              this._moveMap(offset*this.config._previewScale/currentScale);
            }

            this.config._left = mapView.left;
          },
          activate: function() {
            glPanelManager.hideStatusBar();
            var mapView = glPanelManager.mapView;
            this.config._left = mapView.left;
            this.config.screenSize[0] = window.innerWidth-mapView.right-mapView.left-100;
            this.config.screenSize[1] = window.innerHeight-50;
            this.events.toolActivated();

            this._mapResizeListener = this.mapResizeListener.bind(this);
            glPanelManager.on('mapViewResized', this._mapResizeListener);
          },
          deactivate: function() {
            glPanelManager.showStatusBar();
            this.events.toolDeactivated();
            glPanelManager.un('mapViewResized', this._mapResizeListener);
          },
          close: function() {
            $scope.deactivateTool();
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

      $scope.geolocationTool = {
        states: {
          'INACTIVE': 0,
          'ACTIVE_TRACKING': 2,
          'ACTIVE': 1
        },
        active: false,
        state: 0,
        _zoomToLocation: function(geolocation) {
          var extent = geolocation.getAccuracyGeometry().getExtent();
          var width = window.innerWidth-glPanelManager.mapView.left-glPanelManager.mapView.right;
          var height = window.innerHeight-glPanelManager.mapView.top-glPanelManager.mapView.bottom;
          var options = {
            padding: [
              glPanelManager.mapView.top+height/2.5,
              glPanelManager.mapView.right+width/2.5,
              glPanelManager.mapView.bottom+height/2.5,
              glPanelManager.mapView.left+width/2.5
            ],
            minResolution: projectProvider.map.getView().getResolution()
          };
          projectProvider.map.fitAnimated(extent, options, 700);
        },
        toggle: function() {
          var tool = this;
          var states = this.states;
          this.state = (this.state + 1) % 3;

          this.active = this.state !== 0;
          switch(this.state) {
            case states.ACTIVE_TRACKING:
              tool.lastLocationTime = 0;
              var pan = projectProvider.map.getInteractionByClass(ol.interaction.DragPan);
              pan.setActive(false);
              locationService.startTracking(
                projectProvider.map,
                this._zoomToLocation
              );
              break;
            case states.ACTIVE:
              if (!locationService.lastKnownPosition()) {
                $mdToast.show({
                  template: '<div class="toast">\
                    <md-icon class="info" md-svg-icon="circle-i-outline"></md-icon>\
                    Waiting for location\
                    <md-icon class="arrow" md-svg-icon="triangle"></md-icon>\
                    </div>',
                  parent: '.location-toast',
                  hideDelay: 4000,
                  autoWrap: false
                });
              }
              locationService.showPosition(projectProvider.map).then(
                function(geolocation) {
                  $mdToast.hide();
                  tool._zoomToLocation(geolocation);
                  setTimeout(function() {
                    projectProvider.map.once('moveend', function() {
                      console.log('map moved');
                      if (tool.state === states.ACTIVE) {
                        tool.state = states.INACTIVE;
                        tool.active = false;
                        $scope.$apply();
                      }
                    });
                  }, 800);
                  tool.lastLocationTime = new Date();
                  setTimeout(function() {
                    if (tool.state !== states.ACTIVE_TRACKING && tool.lastLocationTime && new Date()-tool.lastLocationTime > 7000) {
                      tool.state = states.INACTIVE;
                      tool.active = false;
                      locationService.deactivate(projectProvider.map);
                      $scope.$apply();
                    }
                  }, 7500);
                }, function(error) {
                  console.log(error);
                }
              );
              break;
            case states.INACTIVE:
              locationService.deactivate(projectProvider.map);
              var pan = projectProvider.map.getInteractionByClass(ol.interaction.DragPan);
              pan.setActive(true);
              break;
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
        glPanelManager.showToolsPanel();// TODO: add delay param
      }, 700);
      if (glPanelManager.mapView.left === 0) {
        glPanelManager.toggleMainPanel();
      }
    };

    $scope.deactivateTool = function() {
      console.log('deactivateTool');
      if ($scope.activeTool) {
        $scope.activeTool.deactivate();
        $scope.activeTool = null;
      }
      glPanelManager.hideToolsPanel();
    };

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

        initializeTools();
        glPanelManager.initialize({
          mainPanel: '#vertical-panel-container',
          statusBar: '#map-status-bar'
        });
        glPanelManager.loadToolsPanel({
          templateUrl: 'tools_panel.html',
          parent: '#tools-panel',
          scope: $scope.$new()
        });
        glPanelManager.showContentPanel({
          templateUrl: 'templates/tools/layers_control.html',
          parent: '#content-panel',
          scope: $scope
        });
        $timeout(function() {
          console.log('initializeProject:activateTool');
          $scope.activateTool($scope.tools.get('identification'));
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
      projectLoader.once('projectClosed', function() {
        $scope.deactivateTool();
        $scope.fullScreenTool.destroy();
      });
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
