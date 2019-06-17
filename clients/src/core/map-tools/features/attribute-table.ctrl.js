(function() {
  'use strict';

  angular
    .module('gl.features')
    .controller('AttributeTableController', AttributeTableController);

  function AttributeTableController($scope, $timeout, projectProvider, gislabClient, featuresViewer, infoPanel, tool) {
    // console.log('AttributeTableController: INIT');
    featuresViewer.initialize();
    $scope.tool = tool;

    var comparators = {
      TEXT: [
        {
          label: '=',
          operand: '=',
          format: 'Text'
        }, {
          label: '!=',
          operand: '!=',
          format: 'Text'
        }, {
          label: 'LIKE',
          operand: '~',
          format: 'Text'
        }, {
          label: 'IN',
          operand: 'IN',
          format: 'Text,Text,...'
        }
      ],
      INTEGER: [
        {
          label: '=',
          operand: '=',
          format: 'Integer',
        }, {
          label: '!=',
          operand: '!=',
          format: 'Integer'
        }, {
          label: '<',
          operand: '<',
          format: 'Integer'
        }, {
          label: '<=',
          operand: '<=',
          format: 'Integer'
        }, {
          label: '>',
          operand: '>',
          format: 'Integer'
        }, {
          label: '>=',
          operand: '>=',
          format: 'Integer'
        }, {
          label: 'IN',
          operand: 'IN',
          format: 'Integer,Integer,...'
        }, {
          label: 'BETWEEN',
          operand: 'BETWEEN',
          format: 'Integer,Integer'
        }, {
          label: 'NOT BETWEEN',
          operand: '',
          format: 'Integer,Integer'
        }
      ],
      DOUBLE: [
        {
          label: '=',
          operand: '=',
          format: 'Real'
        }, {
          label: '!=',
          operand: '!=',
          format: 'Real'
        }, {
          label: '<',
          operand: '<',
          format: 'Real'
        }, {
          label: '<=',
          operand: '<=',
          format: 'Real'
        }, {
          label: '>',
          operand: '>',
          format: 'Real'
        }, {
          label: '>=',
          operand: '>=',
          format: 'Real'
        }, {
          label: 'IN',
          operand: 'IN',
          format: 'Real,Real,...'
          // encode: encoders.LIST
        }, {
          label: 'BETWEEN',
          operand: '',
          format: 'Real,Real'
        }, {
          label: 'NOT BETWEEN',
          operand: '',
          format: 'Real,Real'
        }
      ]
    }

    var layers = [];
    projectProvider.layers.list.forEach(function(layer) {
      if (layer.attributes && layer.attributes.length) {
        var attributes = [];
        layer.attributes.forEach(function(attr) {
          attributes.push({
            label: attr.alias || attr.name,
            type: attr.type.toUpperCase(),
            name: attr.name,
            comparators: comparators[attr.type]
          });
        });

        layers.push({
          title: layer.title,
          name: layer.name,
          index: layers.length,
          attributes: attributes,
          info_template: layer.info_template,
          features: [],
          model: layer
        });
      }
    });
    $scope.layers = layers;

    $scope.setActiveLayer = function(layer) {
      if ($scope.activeLayer !== layer) {
        $scope.activeLayer = layer;
        if (!layer.features.length) {
          $scope.search();
        }
        featuresViewer.setActiveFeaturesLayer(layer.name);
        featuresViewer.removeLayerFeatures(layer.name);
        featuresViewer.selectFeature(null);
      }
    };

    $scope.zoomToFeature = function(feature, options) {
      var params = {
        'VERSION': '1.0.0',
        'SERVICE': 'WFS',
        'REQUEST': 'GetFeature',
        'OUTPUTFORMAT': 'GeoJSON',
        'FEATUREID': feature.id
      }
      $scope.progress = gislabClient.get(projectProvider.data.ows_url, params)
        .then(function(data) {
          var parser = new ol.format.GeoJSON();
          var geomFeature = parser.readFeatures(data)[0];
          featuresViewer.selectFeature(geomFeature);
          featuresViewer.zoomToFeature(geomFeature, options);
          tool.selectedFeature = feature;
        });
    }

    function fetchFeatures (filters) {
      var layerName = $scope.activeLayer.name;
      // convert to WFS layer name
      while (layerName.indexOf(' ') !== -1) {
        layerName = layerName.replace(' ', '_');
      }
      var wfsParams = {
        'layer': layerName,
        'maxfeatures': $scope.tool.config.limit,
        'startindex': 0,
        'filters': filters
      }
      if ($scope.tool.searchInExtent) {
        var size = projectProvider.map.getSize();
        wfsParams['bbox'] = projectProvider.map.getView().calculateExtent(size);
      }
      $scope.progress = gislabClient.post(
        '/filter/?PROJECT={0}'.format(projectProvider.data.project),
        wfsParams)
        .then(function (data) {
          var parser = new ol.format.GeoJSON();
          var features = parser.readFeatures(data);
          $scope.activeLayer.features = features;
          // $scope.activeLayer.features = data.features;
        });
    };

    $scope.search = function() {
      var filters = [];
      $scope.activeLayer.attributes.forEach(function (attribute) {
        if (attribute.filterValue) {
          filters.push({
            attribute: attribute.name,
            value: attribute.filterValue,
            operator: attribute.comparator.operand
          });
        }
      });
      fetchFeatures(filters);
    };

    $scope.showInfoPanel = function(feature) {
      infoPanel.show(feature, $scope.activeLayer, $scope);
    }
    $scope.formatValue = featuresViewer.formatValue.bind(featuresViewer);

    $scope.$on("$destroy", function() {
      // console.log('AttributeTableController: DESTROY');
      featuresViewer.setActiveFeaturesLayer('');
      featuresViewer.selectFeature(null);
      if (infoPanel.isOpen()) {
        infoPanel.close();
      }
    });
  };
})();
