(function() {
  'use strict';

  angular
    .module('gl.measure')
    .controller('MeasureController', MeasureController);

  function MeasureController($scope, $timeout, projectProvider) {
    console.log('MeasureController: INIT');
    var tool = $scope.tool;
    
    var measureTools = {
      Coordinates: {
        geometryType: 'Point',
        drawstart: function(evt) {
          tool.data.position = evt.feature.getGeometry().getCoordinates();
          $scope.$apply();
        },
        drawend: angular.noop
      },
      Length: {
        geometryType: 'LineString',
        formatLength: function(length) {
          if (length > 100) {
            return (Math.round(length / 1000 * 100) / 100) +' km';
          } else {
            return (Math.round(length * 100) / 100) + ' m';
          }
        },
        clickHandler: function(evt) {
          this._partialLength = this._lengthTotal;
        },
        moveHandler: function(evt) {
          var geom = this.feature.getGeometry();
          this._lengthTotal = geom.getLength();
          tool.data.length.lastSegment = this.formatLength(this._lengthTotal - this._partialLength);
          tool.data.length.total = this.formatLength(this._lengthTotal);
          $scope.$apply();
        },
        drawstart: function(evt) {
          this._partialLength = 0;
          this._lengthTotal = 0;
          this.feature = evt.feature;
          projectProvider.map.on('pointermove', this.moveHandler, this);
          projectProvider.map.on('click', this.clickHandler, this);
        },
        drawend: function(evt) {
          projectProvider.map.un('click', this.clickHandler);
          projectProvider.map.un('pointermove', this.moveHandler);
        }
      },
      Area: {
        geometryType: 'Polygon',
        formatArea: function(area) {
          if (area > 10000) {
            return (Math.round(area / 1000000 * 100) / 100) +' km²';
          } else {
            return (Math.round(area * 100) / 100) + ' m²';
          }
        },
        moveHandler: function(evt) {
          var geom = this.feature.getGeometry();
          tool.data.area = this.formatArea(geom.getArea());
          $scope.$apply();
        },
        drawstart: function(evt) {
          this.feature = evt.feature;
          projectProvider.map.on('pointermove', this.moveHandler, this);
        },
        drawend: function(evt) {
          projectProvider.map.un('pointermove', this.moveHandler);
        }
      }
    };

    var drawTool, measureTool;
    var source = new ol.source.Vector();
    var measureLayer = new ol.layer.Vector({
      source: source,
      style: new ol.style.Style({
        fill: new ol.style.Fill({
          color: 'rgba(255, 255, 255, 0.3)'
        }),
        stroke: new ol.style.Stroke({
          color: '#ffcc33',
          width: 2
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
      if (tool.config.active) {
        initializeMeasurement();
      }
    };
  }
})();
