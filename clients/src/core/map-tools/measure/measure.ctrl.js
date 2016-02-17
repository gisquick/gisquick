(function() {
  'use strict';

  angular
    .module('gl.measure')
    .controller('MeasureController', MeasureController);

  function MeasureController($scope, $timeout, projectProvider) {
    console.log('MeasureController: INIT');
    var tool = $scope.tool;
    
    var unit2unit = {
      m: {
        m: 1,
        km: 0.001,
        mi: 0.00062137
      },
      m2: {
        m2: 1,
        km2: 0.000001,
        ha: 0.0001,
        a: 0.01
      }
    };

    tool.events.unitsChanged = function(units) {
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

    function formatLength(length, units) {
      var unitsLabel;
      if (units && units.name) {
        length = length * unit2unit['m'][units.name];
        unitsLabel = units.label;
      } else {
        if (length > 1000) {
          return formatLength(length, {name: 'km', label: 'km'});
        } else {
          unitsLabel = 'm';
        }
      }
      var decimalPlaces;
      if (length > 100000) {
        decimalPlaces = 0;
      } else if (length > 10000) {
        decimalPlaces = 1;
      } else {
        decimalPlaces = 2;
      }
      return length.toFixed(decimalPlaces)+' '+unitsLabel;
    }

    function formatArea(area, units) {
      var unitsLabel;
      if (units && units.name) {
        area = area * unit2unit['m2'][units.name];
        unitsLabel = units.label;
      } else {
        if (area > 1000000) {
          return formatArea(area, {name: 'km2', label: 'km²'});
        } else {
          unitsLabel = 'm²';
        }
      }
      var decimalPlaces;
      if (area > 100000) {
        decimalPlaces = 0;
      } else if (area > 10000) {
        decimalPlaces = 1;
      } else {
        decimalPlaces = 2;
      }
      return area.toFixed(decimalPlaces)+' '+unitsLabel;
    }

    var mapProjection = projectProvider.map.getView().getProjection();
    var measureTools = {
      Coordinates: {
        geometryType: 'Point',
        mapProjection: mapProjection,
        drawstart: function(evt) {
          this.feature = evt.feature;
          this._position = evt.feature.getGeometry().getCoordinates();
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
        },
        drawend: angular.noop
      },
      Length: {
        geometryType: 'LineString',
        mapProjection: mapProjection,
        geodesic: mapProjection.isGlobal(),
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
          this.updateValue();
          $scope.$apply();
        },
        updateValue: function() {
          var units = tool.config.lengthUnits[tool.config.lengthUnitsIndex];
          tool.data.length.lastSegment = this._lengthTotal?
            formatLength(this._lengthTotal - this._partialLength, units) : '';
          tool.data.length.total = this._lengthTotal? formatLength(this._lengthTotal, units) : '';
        },
        drawstart: function(evt) {
          this._partialLength = 0;
          this._lengthTotal = 0;
          this.feature = evt.feature;
          this._moveHandlerKey = projectProvider.map.on('pointermove', this.moveHandler, this);
          this._clickHandlerKey = projectProvider.map.on('click', this.clickHandler, this);
        },
        drawend: function(evt) {
          console.log('drawend');
          projectProvider.map.unByKey(this._moveHandlerKey);
          projectProvider.map.unByKey(this._clickHandlerKey);
        }
      },
      Area: {
        geometryType: 'Polygon',
        mapProjection: mapProjection,
        geodesic: mapProjection.isGlobal(),
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
          this.updateValue();
          $scope.$apply();
        },
        updateValue: function() {
          var areaUnits = tool.config.areaUnits[tool.config.areaUnitsIndex];
          var lengthUnits = tool.config.lengthUnits[tool.config.lengthUnitsIndex];
          tool.data.area = this._area > 0? formatArea(this._area, areaUnits) : '';
          tool.data.perimeter = this._perimeter? formatLength(this._perimeter, lengthUnits) : '';
        },
        drawstart: function(evt) {
          this.feature = evt.feature;
          this._moveHandlerKey = projectProvider.map.on('pointermove', this.moveHandler, this);
        },
        drawend: function(evt) {
          projectProvider.map.unByKey(this._moveHandlerKey);
        }
      }
    };

    var drawTool, measureTool;
    var source = new ol.source.Vector();
    var measureLayer = new ol.layer.Vector({
      source: source,
      style: new ol.style.Style({
        fill: new ol.style.Fill({
          color: 'rgba(255, 255, 255, 0.4)'
        }),
        stroke: new ol.style.Stroke({
          color: '#ffcc33',
          width: 3
        }),
        image: new ol.style.Circle({
          radius: 7,
          fill: new ol.style.Fill({
            color: '#ffcc33'
          })
        })
      })
    });

    function initializeMeasurement() {
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
      measureTool = measureTools[type];
      source.clear();
      if (tool.config.active) {
        initializeMeasurement();
      }
      if (measureTool.feature) {
        source.addFeatures([measureTool.feature]);
      }
    };
  }
})();
