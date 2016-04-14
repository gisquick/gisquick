(function() {
  'use strict';

  angular
    .module('gl.measure')
    .controller('MeasureController', MeasureController);

  function MeasureController($scope, $timeout, projectProvider, featuresViewer) {
    console.log('MeasureController: INIT');
    var tool = $scope.tool;

    function updateUnits() {
      var unitsSystem = tool.config.unitsSystems[tool.config.unitsSystemIndex];

      if (tool.config.lengthUnitIndex !== 'auto') {
        tool.config.lengthUnits = [unitsSystem.lengthUnits[tool.config.lengthUnitIndex]];
      } else {
        tool.config.lengthUnits = unitsSystem.lengthUnits.filter(function(unit) {
          return unitsSystem.lengthAutoUnits.indexOf(unit.label) !== -1;
        });
      }

      if (tool.config.areaUnitIndex !== 'auto') {
        tool.config.areaUnits = [unitsSystem.areaUnits[tool.config.areaUnitIndex]];
      } else {
        tool.config.areaUnits = unitsSystem.areaUnits.filter(function(unit) {
          return unitsSystem.areaAutoUnits.indexOf(unit.label) !== -1;
        });
      }
    }

    tool.events.unitsChanged = function() {
      updateUnits();
      measureTool.updateValue();
    };

    var wgs84Sphere = new ol.Sphere(6378137);
    function geodesicLength(line, proj, linearRing) {
      var coordinates = line.getCoordinates();
      var length = 0;
      for (var i = 0, ii = coordinates.length - 1; i < ii; ++i) {
        var c1 = ol.proj.toLonLat(coordinates[i], proj);
        var c2 = ol.proj.toLonLat(coordinates[i + 1], proj);
        length += wgs84Sphere.haversineDistance(c1, c2);
      }
      return length;
    }

    function geodesicPerimeter(polygon, proj) {
      var linearRing = polygon.getLinearRing(0);
      var length = geodesicLength(linearRing, proj);
      var coordinates = linearRing.getCoordinates();
      var c1 = ol.proj.toLonLat(coordinates[0], proj);
      var c2 = ol.proj.toLonLat(coordinates[coordinates.length - 1], proj);
      length += wgs84Sphere.haversineDistance(c1, c2);
      return length;
    }

    function geodesicArea(polygon, proj) {
      var geom = (polygon.clone().transform(proj, 'EPSG:4326'));
      var coordinates = geom.getLinearRing(0).getCoordinates();
      return Math.abs(wgs84Sphere.geodesicArea(coordinates));
    }

    function formatValue(value, convertFn, units) {
      var unit;
      var unitValue;
      var unitIndex = 0;
      while (unitIndex < units.length) {
        unit = units[unitIndex];
        unitValue = convertFn(value, unit);
        if (unit.maxValue && unitValue < unit.maxValue) {
          break;
        }
        unitIndex++;
      }

      var decimalPlaces;
      if (unitValue > 100000) {
        decimalPlaces = 0;
      } else if (unitValue > 10000) {
        decimalPlaces = 1;
      } else {
        decimalPlaces = 2;
      }
      return unitValue.toFixed(decimalPlaces)+' '+unit.label;
    }

    function formatLength(length, unitSystem) {
      return formatValue(length, tool.convertLength, unitSystem);
    }

    function formatArea(area, unitSystem) {
      return formatValue(area, tool.convertArea, unitSystem);
    }

    function createLabel() {
      var element = document.createElement('div');
      element.className = 'measure-label';
      var overlay = new ol.Overlay({
        element: element,
        offset: [-24, -32],
        positioning: 'center-left'
      });
      projectProvider.map.addOverlay(overlay);
      return overlay;
    }

    var mapProjection = projectProvider.map.getView().getProjection();
    var measureTools = {
      Coordinates: {
        geometryType: 'Point',
        mapProjection: mapProjection,
        label: null,
        drawstart: function(evt) {
          this.feature = evt.feature;
          this._position = evt.feature.getGeometry().getCoordinates();
          this.label.setPosition(this._position);
          this.updateValue();
          $scope.$apply();
        },
        updateValue: function() {
          if (!this._position)
            return;

          var coords;
          var units = tool.config.positionUnits[tool.config.positionUnitsIndex];
          if (units.projection.getCode() === 'EPSG:4326') {
            coords = ol.proj.toLonLat(this._position, this.mapProjection);
            if (units.name === 'EPSG:4326_HDMS') {
              var hdms = ol.coordinate.toStringHDMS(coords);
              hdms = hdms.replace('N ', 'N;').replace('S ', 'S;');
              coords = hdms.split(";");
              tool.data.position = coords;
              this.label.getElement().innerHTML = tool.data.position.join(', ');
              return;
            }
            coords.reverse();
          } else {
            coords = this._position;
          }
          tool.data.position = [
            coords[0].toFixed(units.decimalPlaces)+' '+units.label,
            coords[1].toFixed(units.decimalPlaces)+' '+units.label
          ];
          this.label.getElement().innerHTML = tool.data.position.join(', ');
        },
        drawend: angular.noop
      },
      Length: {
        geometryType: 'LineString',
        mapProjection: mapProjection,
        geodesic: mapProjection.isGlobal(),
        label: null,
        clickHandler: function(evt) {
          this._newSegment = true;
        },
        moveHandler: function(evt) {
          var geom = this.feature.getGeometry();
          if (this._newSegment) {
            this._partialLength = this._lengthTotal;
            this._newSegment = false;
          }

          this._lengthTotal = this.geodesic? geodesicLength(geom, mapProjection) : geom.getLength();
          /*
          var count = geom.getFlatCoordinates().length;
          var lastSegmentLength = ol.geom.flat.length.lineString(
            geom.getFlatCoordinates(), count>4? count-4 : 0, count, 2
          );*/
          this.label.setPosition(this.feature.getGeometry().getLastCoordinate());
          this.updateValue();
        },
        updateValue: function() {
          if (this._lengthTotal) {
            tool.data.length.lastSegment =
              formatLength(this._lengthTotal - this._partialLength, tool.config.lengthUnits);
            tool.data.length.total = formatLength(this._lengthTotal, tool.config.lengthUnits);
            this.label.getElement().innerHTML = tool.data.length.total;
          } else {
            tool.data.length.lastSegment = '';
            tool.data.length.total = '';
          }
        },
        drawstart: function(evt) {
          this._partialLength = 0;
          this._lengthTotal = 0;
          this.feature = evt.feature;
          this._moveHandlerKey = projectProvider.map.on('pointermove', this.moveHandler, this);
          this._clickHandlerKey = projectProvider.map.on('click', this.clickHandler, this);

          // optimized angular data-binding updates
          var lastUpdatedValue;
          var measureTool = this;
          this.updateTimer = setInterval(function() {
            if (measureTool._lengthTotal !== lastUpdatedValue) {
              $scope.$apply();
              lastUpdatedValue = measureTool._lengthTotal;
            }
          }, 80);
        },
        drawend: function(evt) {
          projectProvider.map.unByKey(this._moveHandlerKey);
          projectProvider.map.unByKey(this._clickHandlerKey);
          clearInterval(this.updateTimer);
          // create feature's outline
          this.outlineFeature = this.feature.clone();
          this.outlineFeature.setStyle(outlineStyle);
          source.addFeatures([this.outlineFeature]);
        }
      },
      Area: {
        geometryType: 'Polygon',
        mapProjection: mapProjection,
        geodesic: mapProjection.isGlobal(),
        label: null,
        moveHandler: function(evt) {
          var geom = this.feature.getGeometry();
          var pointsCount = geom.getLinearRing(0).getCoordinates().length;
          if (pointsCount < 3) {
            this._perimeter = 0;
            this._area = 0;
          } else {
            this._area = this.geodesic? geodesicArea(geom, this.mapProjection) : geom.getArea();
            if (this.geodesic) {
              this._perimeter = geodesicPerimeter(geom, this.mapProjection);
              this._area = geodesicArea(geom, this.mapProjection);
            } else {
              this._perimeter = ol.geom.flat.length.linearRing(
                geom.getFlatCoordinates(), 0, pointsCount*2, 2
              );
              this._area = geom.getArea();
            }
          }
          this.label.setPosition(this.feature.getGeometry().getLastCoordinate());
          this.updateValue();
        },
        updateValue: function() {
          if (this._area > 0) {
            tool.data.area = formatArea(this._area, tool.config.areaUnits);
            tool.data.perimeter = formatLength(this._perimeter, tool.config.lengthUnits);
            this.label.getElement().innerHTML = tool.data.area;
          } else {
            tool.data.area = '';
            tool.data.perimeter = '';
          }
        },
        drawstart: function(evt) {
          this.feature = evt.feature;
          this._moveHandlerKey = projectProvider.map.on('pointermove', this.moveHandler, this);

          // optimized angular data-binding updates
          var lastUpdatedValue;
          var measureTool = this;
          this.updateTimer = setInterval(function() {
            if (measureTool._area !== lastUpdatedValue) {
              $scope.$apply();
              lastUpdatedValue = measureTool._area;
            }
          }, 80);
        },
        drawend: function(evt) {
          projectProvider.map.unByKey(this._moveHandlerKey);
          clearInterval(this.updateTimer);
          // create feature's outline
          this.outlineFeature = this.feature.clone();
          this.outlineFeature.setStyle(outlineStyle);
          source.addFeatures([this.outlineFeature]);
        }
      }
    };

    var drawTool, measureTool;
    var source = new ol.source.Vector();
    var measureLayer = new ol.layer.Vector({
      source: source,
      style: new ol.style.Style({
        zIndex: 100,
        fill: new ol.style.Fill({
          color: 'rgba(255, 255, 255, 0.4)'
        }),
        stroke: new ol.style.Stroke({
          color: 'rgb(250, 188, 0)',
          width: 4
        }),
        image: new ol.style.Circle({
          radius: 7,
          fill: new ol.style.Fill({
            color: 'rgb(250, 188, 0)'
          }),
          stroke: new ol.style.Stroke({
            color: '#ffffff',
            width: 1.5
          })
        })
      })
    });

    var outlineStyle = new ol.style.Style({
      zIndex: 99,
      stroke: new ol.style.Stroke({
        color: '#ffffff',
        width: 5.5
      })
    });

    function initializeMeasurement() {
      updateUnits();
      if (drawTool) {
        projectProvider.map.removeInteraction(drawTool);
      }
      drawTool = new ol.interaction.Draw({
        source: source,
        type: measureTool.geometryType
      });
      projectProvider.map.addInteraction(drawTool);
      drawTool.on('drawstart', function(evt) {
        source.clear();
        if (!measureTool.label) {
          measureTool.label = createLabel();
        }
        measureTool.label.getElement().innerHTML = '';
        measureTool.drawstart(evt);
      });

      drawTool.on('drawend', function(evt) {
        measureTool.drawend(evt);
      });
    }

    tool.events.toolActivated = function() {
      tool.config.active = true;
      initializeMeasurement();
      projectProvider.map.addLayer(measureLayer);
    };

    tool.events.toolDeactivated = function() {
      tool.config.active = false;
      projectProvider.map.removeLayer(measureLayer);
      if (drawTool) {
        projectProvider.map.removeInteraction(drawTool);
      }
    }

    $scope.setMeasureType = function(type) {
      if (measureTool && measureTool.label) {
        angular.element(measureTool.label.getElement()).addClass('hidden');
      }
      measureTool = measureTools[type];
      measureTool.updateValue();
      if (measureTool.label) {
        angular.element(measureTool.label.getElement()).removeClass('hidden');
      }
      source.clear();
      if (tool.config.active) {
        initializeMeasurement();
      }
      if (measureTool.feature) {
        var features = [measureTool.feature];
        if (measureTool.outlineFeature) {
          features.push(measureTool.outlineFeature);
        }
        source.addFeatures(features);
      }
    };

    $scope.zoomTo = function(options) {
      if (measureTool.feature) {
        featuresViewer.zoomToFeature(measureTool.feature, options);
      }
    };

  }
})();
