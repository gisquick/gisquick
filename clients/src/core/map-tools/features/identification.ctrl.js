(function() {
  'use strict';

  angular
    .module('gl.features')
    .controller('IdentificationController', IdentificationController);

  function IdentificationController($scope, $timeout, projectProvider, layersControl, gislabClient, featuresViewer, $mdIcon) {
    console.log('IdentificationController: INIT');
    var tool = $scope.tool;
    var mapClickListener;

    $scope.tool.onActivated = function() {
      featuresViewer.initialize();
      featuresViewer.setActiveFeaturesLayer('');
      $scope.layers = [{name: '', features: []}];

      if (!tool._markerOverlay) {
        var markerElem = angular.element('<div style="width: 12px; height: 12px;">');
        $mdIcon(tool.markerIcon).then(function(elem) {
          var iconElem = angular.element(elem);
          iconElem.css('fill', '#f00000');
          markerElem.append(iconElem);
        });
        tool._markerOverlay = new ol.Overlay({
          element: markerElem,
          positioning: 'center-center'
        });
        projectProvider.map.addOverlay(tool._markerOverlay);
      }
      tool._markerOverlay.setPosition(undefined);

      mapClickListener = projectProvider.map.on('singleclick', function(evt) {
        var coords = projectProvider.map.getCoordinateFromPixel(evt.pixel);
        var pixelRadius = 8;
        var radius = Math.abs(projectProvider.map.getCoordinateFromPixel([
            evt.pixel[0]+pixelRadius,
            evt.pixel[1]
          ])[0]-coords[0]);

        var identifyPolygon = ol.geom.Polygon.fromCircle(
          new ol.geom.Circle(coords, radius), 6
        );
        var gml = new ol.format.GML3();
        var identifyPolygonGml = gml.writeGeometryNode(identifyPolygon).innerHTML;
        var filter = [
          "<Filter>",
            "<ogc:Intersects>",
              "<ogc:PropertyName>geometry</ogc:PropertyName>",
              identifyPolygonGml,
            "</ogc:Intersects>",
          "</Filter>"
        ].join("");

        var layerName = $scope.tool.identificationLayer?
          Layers.project2wfs[$scope.tool.identificationLayer] :
          layersControl.getVisibleLayers(projectProvider.map).map(wfsLayerName).join(",");
        var params = {
          'VERSION': '1.0.0',
          'SERVICE': 'WFS',
          'REQUEST': 'GetFeature',
          'OUTPUTFORMAT': 'GeoJSON',
          'TYPENAME': layerName,
          'FILTER': filter
        }
        $scope.progress = gislabClient.get(projectProvider.config.ows_url, params)
          .then(function(data) {
            var parser = new ol.format.GeoJSON();
            var features = parser.readFeatures(data);
            setFeatures(features);
          });

        tool._markerOverlay.setPosition(projectProvider.map.getCoordinateFromPixel(evt.pixel));
      });
    };

    // conversions between project's layers names and WFS names
    // (WFS layer name cannot contain space character)
    var Layers = {
      wfs2project: {},
      project2wfs: {}
    };
    function wfsLayerName(layerName) {
      var name = layerName;
      while (name.indexOf(' ') != -1) {
        name = name.replace(' ', '_');
      }
      return name;
    }
    projectProvider.layers.list.forEach(function(layer) {
      var wfsName = wfsLayerName(layer.name);
      Layers.wfs2project[wfsName] = layer.name;
      Layers.project2wfs[layer.name] = wfsName;
    });
    /*
    $scope.$watch('tool.layerIndex', function(value) {
      if (angular.isDefined(value) && $scope.layers) {
        if (value < $scope.layers.length) {
          featuresViewer.setActiveFeaturesLayer($scope.layers[value].name);
        } else {
          featuresViewer.setActiveFeaturesLayer(null);
        }
      }
    });*/

    function setFeatures (features) {
      // clear prevoius selection

      if (features.length > 0) {
        // organize features by layer name
        var layerFeatures = {};
        features.forEach(function(feature) {
          if (feature instanceof ol.Feature) {
            var fid = feature.getId();
            var layername = Layers.wfs2project[
              fid.substring(0, fid.lastIndexOf('.'))
            ];
            if (!layerFeatures.hasOwnProperty(layername)) {
              layerFeatures[layername] = [];
            }
            layerFeatures[layername].push(feature);
          }
        });
        var layers = [];
        for (var layername in layerFeatures) {
          layers.push({
            name: layername,
            attributes: featuresViewer.getLayerAttributes(layername),
            features: layerFeatures[layername]
          });
        }
        featuresViewer.setLayersFeatures(layerFeatures);
        featuresViewer.setActiveFeaturesLayer(layers[0].name);
        tool.showTable(layers);
      } else {
        featuresViewer.setActiveFeaturesLayer('');
        tool.showTable([]);
      }
    }

    $scope.tool.onDeactivated = function() {
      // console.log('IdentificationController: DESTROY');
      projectProvider.map.unByKey(mapClickListener);
      featuresViewer.setActiveFeaturesLayer('');
      featuresViewer.selectFeature(null);
      if (tool._markerOverlay) {
        tool._markerOverlay.setPosition(undefined);
      }
    };
  };
})();
