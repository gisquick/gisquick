(function() {
  'use strict';

  angular
    .module('gl.web')
    .controller('ToolsController', ToolsController);


  function ToolsController($scope, $timeout, $q, $mdDialog, $mdToast, projectProvider,
                            gislabClient, glPanelManager, toolsManager, locationService) {

    /** ************************************************
     **************    Full Screen Tool    *************
     ***************************************************/
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

    /** ************************************************
     **************    Geolocation Tool    *************
     ***************************************************/
    $scope.geolocationTool = {
      states: {
        'INACTIVE': 0,
        'ACTIVE': 1,
        'ACTIVE_TRACKING': 2
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
            // zoom to current location and then after defined time change state back to INACTIVE
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

    function initializeTools() {
      /** **********************************************
       ***********    Attribute Table Tool    **********
       *************************************************/
      toolsManager.addTool({
        name: 'attribute_table',
        ui: {
          secondaryPanel: {
            left: {
              position: 'bottom',
              template: 'templates/tools/attribute_table/list_table.html'
            },
            bottom: {
              template: 'templates/tools/attribute_table/table.html'
            },
            header: '#vertical-attribute-table-header',
            controller: 'AttributeTableController'
          }
        },
        config: {
          mapView: glPanelManager.mapView,
          rowsPerPage: 5,
          limit: 50
        },
        initialize: function() {
          var queryableLayersIndexes = {};
          projectProvider.layers.list.filter(function(layer_data) {
            return layer_data.attributes && layer_data.attributes.length;
          }).forEach(function(layer_data, index) {
            queryableLayersIndexes[layer_data.name] = index;
          });
          this.queryableLayersIndexes = queryableLayersIndexes;
        },
        activate: function() {},
        showTable: function(layer) {
          console.log('show attribute table');
          this.config.activeLayer = layer;
          this.config.layerIndex = this.queryableLayersIndexes[layer.name];
          if (glPanelManager.secondaryLeftPanel) {
            glPanelManager.secondaryLeftPanel.title = layer.title;
          }
        },
        deactivate: function() {
          this.config.activeLayer = null;
        }
      });
      /** *********************************************
       ***********    Identification Tool    **********
       ************************************************/
      toolsManager.addTool({
        name: 'identification',
        // tooltip: 'Identify features by mouse click',
        ui: {
          primaryPanel: {
            title: 'Identification',
            icon: 'circle-i',
            template: 'templates/tools/identification/form.html'
          },
          secondaryPanel: {
            left: {
              position: 'top',
              template: 'templates/tools/identification/list_table.html',
            },
            bottom: {
              template: 'templates/tools/identification/table.html'
            },
            header: '#vertical-identification-table-header',
            controller: 'IdentificationTableController',
            resolve: {} // will be set properly on tool activation
          }
        },
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
          layers: [],
          activeLayer: null,
          activeLayerIndex: null
        },
        events: {
          featuresChanged: angular.noop,
          toolActivated: angular.noop,
          toolDeactivated: angular.noop
        },
        initialize: angular.noop,
        activate: function() {
          this.panelResolve = $q.defer();
          var resolve = this.panelResolve;
          this.ui.secondaryPanel.resolve = {
            open: function() {return resolve.promise;}
          };
          this.events.toolActivated();
        },
        deactivate: function() {
          if (this.panelResolve) {
            this.panelResolve.reject();
          }
          this.events.toolDeactivated();
        },
        showTable: function(layersFeatures) {
          if (this.panelResolve) {
            console.log('identification: show attribute table');
            this.panelResolve.resolve();
            this.panelResolve = null;
          }
          this.events.featuresChanged();
        }
      });
      /** **********************************************
       ***************    Measure Tool    **************
       *************************************************/
      toolsManager.addTool({
        name: 'measure',
        tooltip: 'Mesure coordinates, length and area',
        ui: {
          primaryPanel: {
            title: 'Measure',
            icon: 'ruler',
            template: 'templates/tools/measure.html'
          }
        },
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
                name: projectProvider.data.projection.code,
                title: '{0} ({1})'.format(
                  projectProvider.data.projection.code,
                  mapProjection.getUnits()
                ),
                projection: mapProjection,
                label: mapProjection.getUnits(),
                decimalPlaces: projectProvider.data.position_precision.decimal_places
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
      });
      /** **********************************************
       ****************    Print Tool    ***************
       *************************************************/
      toolsManager.addTool({
        name: 'print',
        // tooltip: 'Print output creation',
        disabled: !(projectProvider.data.print_composers && projectProvider.data.print_composers.length),
        ui: {
          primaryPanel: {
            title: 'Print',
            icon: 'printer',
            template: 'templates/tools/print.html'
          }
        },
        previewTemplate: 'templates/tools/print_preview.html',
        config: {
          previewParentElement: projectProvider.map.getTargetElement().parentElement,
          layouts: undefined, // define in initialization function
          dpi: 96,
          format: 'png',
          rotation: 0,
          title: projectProvider.data.root_title,
          author: gislabClient.userInfo.full_name,
          screenSize: [0, 0], // available screen size for print preview
          contact:
            '<div style="position:absolute;bottom:0;right:0;font-family:Liberation Sans;">\
              <span>{0}<br />{1}</span>\
            </div>'.format(projectProvider.data.organization, projectProvider.data.email)
        },
        data: {},
        events: {
          toolActivated: angular.noop,
          toolDeactivated: angular.noop,
          layoutChanged: angular.noop
        },
        initialize: function() {
          if (!projectProvider.data.print_composers) {
            return;
          }
          // sort layouts by height
          var layouts = projectProvider.data.print_composers.sort(function(a, b) {
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
        }
      });

      $scope.fullScreenTool.initialize();
      toolsManager.tools.forEach(function(tool) {
        tool.initialize();
      });
    }

    /**
     * Activates toolbar tool (with UI panels management)
     * @param {object} tool Tool data model (config)
     */
    var activateTool = function(tool) {
      console.log('activateTool: '+tool.name);
      var previousTool = toolsManager.activeTool;
      if (previousTool) {
        previousTool.deactivate();
        if (previousTool._secondaryPanel && !tool.ui.secondaryPanel) {
          glPanelManager.hidePanel();
        }
      }

      toolsManager.activeTool = tool;
      toolsManager.activeTool.activate();

      if (tool.ui.primaryPanel) {
        glPanelManager.activeToolIndex = tool._tabIndex;
        glPanelManager.activeToolTitle = tool.ui.primaryPanel.title;
        glPanelManager.showToolsPanel();
        // automatically expand left panel when collapsed
        if (glPanelManager.mapView.left === 0) {
          glPanelManager.toggleMainPanel();
        }
      } else {
        glPanelManager.hideToolsPanel();
      }
      if (tool.ui.secondaryPanel) {
        var options = angular.extend({
          scope: $scope.$new(),
          locals: {tool: tool}
        }, tool.ui.secondaryPanel);

        if (previousTool && previousTool._secondaryPanel) {
          // Switch panel - pabel of last active tool with a new tool
          tool._secondaryPanel = glPanelManager.switchPanel(options);
        } else {
          tool._secondaryPanel = glPanelManager.showPanel(options);
        }
        // handle panel's closing while the tool is still active
        var panelClosed = function() {
          if (toolsManager.activeTool && toolsManager.activeTool.name === tool.name) {
            console.log("tool's panel closed by somebody");
            tool._secondaryPanel = null;
            toolsManager.deactivateTool();
          }
        };
        tool._secondaryPanel.then(panelClosed);
        tool._secondaryPanel.catch(panelClosed);
      }
    };

    /**
     * Deactivates current active tool
     */
    var deactivateTool = function() {
      console.log('deactivateTool');
      if (toolsManager.activeTool) {
        if (toolsManager.activeTool._secondaryPanel) {
          glPanelManager.hidePanel();
        }
        toolsManager.activeTool.deactivate();
        toolsManager.activeTool = null;
      }
      glPanelManager.hideToolsPanel();
    };

    // override activateTool/deactivateTool methods to include handling of UI
    toolsManager.activateTool = activateTool;
    toolsManager.deactivateTool = deactivateTool;


    projectProvider.once('mapInitialized', initializeTools);

    projectProvider.once('projectClosed', function() {
      toolsManager.deactivateTool();
      toolsManager.tools = [];
      $scope.fullScreenTool.destroy();
    });
  };
})();
