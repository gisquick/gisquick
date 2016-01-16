(function() {
  'use strict';

  angular
    .module('gl.features')
    .controller('IdentificationController', IdentificationController);

  function IdentificationController($scope, $timeout, projectProvider, layersControl, gislabClient, featuresViewer, tool, $mdIcon) {
    // console.log('IdentificationController: INIT');
    $scope.tool = tool;
    $scope.showTabsHeader = false;
    featuresViewer.initialize();

    featuresViewer.setActiveFeaturesLayer('');
    $scope.layers = [{
      name: '',
      attributes: [],
      features: []
    }];

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

    $scope.$watch('tool.layerIndex', function(value) {
      if (angular.isDefined(value) && $scope.layers) {
        featuresViewer.setActiveFeaturesLayer($scope.layers[value].name);
      }
    });

    $scope.selectFeature = function(feature) {
      featuresViewer.selectFeature(feature);
      $scope.selectedFeature = feature;
    };

    $scope.zoomToFeature = function(feature) {
      featuresViewer.zoomToFeature(feature);
    }

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
        //$scope.showTabsHeader = $scope.tool.identificationLayer? false : true;
        $scope.showTabsHeader = true;
        $scope.layers = layers;
      } else {
        featuresViewer.setActiveFeaturesLayer('');
        $scope.showTabsHeader = false;
        $scope.layers = [{
          name: '',
          attributes: [{label: "No features"}],
          features: []
        }];
      }
    }

    var mapClickListener = projectProvider.map.on('singleclick', function(evt) {
      $timeout(function() {
        $scope.tool.collapsed = false;
      });

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

    $scope.$on("$destroy", function() {
      // console.log('IdentificationController: DESTROY');
      projectProvider.map.unByKey(mapClickListener);
      featuresViewer.setActiveFeaturesLayer('');
      featuresViewer.selectFeature(null);
      tool._markerOverlay.setPosition(undefined);
    });
  };
})();
