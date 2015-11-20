(function() {
  'use strict';

  angular
    .module('gl.features')
    .controller('SearchController', SearchController);

  function SearchController($scope, projectProvider, gislabClient, featuresViewer, tool) {
    console.log('SearchController: INIT');
    featuresViewer.initialize();
    $scope.tool = tool;

    var encoders = {
      TEXT: function (attr, operand, value) {
        return "\"{0}\" {1} '{2}'".format(attr, operand, value);
      },
      NUMBER: function (attr, operand, value) {
        return "\"{0}\" {1} {2}".format(attr, operand, value);
      },
      LIST: function (attr, operand, value) {
        var list_values = [];
        value.split(',').forEach(function (item) {
          list_values.push(item.trim());
        });
        return "\"{0}\" {1} ( {2} ) ".format(attr, operand, list_values.join(" , "));
      },
      TEXT_LIST: function (attr, operand, value) {
        var list_values = [];
        value.split(',').forEach(function (item) {
          list_values.push(item.trim());
        });
        return "\"{0}\" {1} ( '{2}' ) ".format(attr, operand, list_values.join("' , '"));
      }
    };
    var comparators = {
      TEXT: [
        {
          label: '=',
          operand: '=',
          format: 'Text',
          encode: encoders.TEXT
        }, {
          label: '!=',
          operand: '!=',
          format: 'Text',
          encode: encoders.TEXT
        }, {
          label: 'LIKE',
          operand: 'LIKE',
          format: 'Text',
          encode: function(attr, operand, value) {
            return "\"{0}\" {1} '%{2}%'".format(attr, operand, value);
          }
        }, {
          label: 'IN',
          operand: 'IN',
          format: 'Text,Text,...',
          encode: encoders.TEXT_LIST
        }
      ],
      INTEGER: [
        {
          label: '=',
          operand: '=',
          format: 'Integer',
          encode: encoders.NUMBER
        }, {
          label: '!=',
          operand: '!=',
          format: 'Integer',
          encode: encoders.NUMBER
        }, {
          label: '<',
          operand: '<',
          format: 'Integer',
          encode: encoders.NUMBER
        }, {
          label: '<=',
          operand: '<=',
          format: 'Integer',
          encode: encoders.NUMBER
        }, {
          label: '>',
          operand: '>',
          format: 'Integer',
          encode: encoders.NUMBER
        }, {
          label: '>=',
          operand: '>=',
          format: 'Integer',
          encode: encoders.NUMBER
        }, {
          label: 'IN',
          operand: 'IN',
          format: 'Integer,Integer,...',
          encode: encoders.LIST
        }, {
          label: 'BETWEEN',
          operand: '',
          format: 'Integer,Integer',
          encode: function(attr, operand, value) {
            var values = value.split(",");
            return "\"{0}\" >= {1} AND \"{0}\" <= {2}".format(attr, values[0], values[1]);
          }
        }, {
          label: 'NOT BETWEEN',
          operand: '',
          format: 'Integer,Integer',
          encode: function(attr, operand, value) {
            var values = value.split(",");
            return "( \"{0}\" < {1} OR \"{0}\" > {2} )".format(attr, values[0], values[1]);
          }
        }
      ],
      DOUBLE: [
        {
          label: '=',
          operand: '=',
          format: 'Real',
          encode: encoders.NUMBER
        }, {
          label: '!=',
          operand: '!=',
          format: 'Real',
          encode: encoders.NUMBER
        }, {
          label: '<',
          operand: '<',
          format: 'Real',
          encode: encoders.NUMBER
        }, {
          label: '<=',
          operand: '<=',
          format: 'Real',
          encode: encoders.NUMBER
        }, {
          label: '>',
          operand: '>',
          format: 'Real',
          encode: encoders.NUMBER
        }, {
          label: '>=',
          operand: '>=',
          format: 'Real',
          encode: encoders.NUMBER
        }, {
          label: 'IN',
          operand: 'IN',
          format: 'Real,Real,...',
          encode: encoders.LIST
        }, {
          label: 'BETWEEN',
          operand: '',
          format: 'Real,Real',
          encode: function(attr, operand, value) {
            var values = value.split(",");
            return "\"{0}\" >= {1} AND \"{0}\" <= {2}".format(attr, values[0], values[1]);
          }
        }, {
          label: 'NOT BETWEEN',
          operand: '',
          format: 'Real,Real',
          encode: function(attr, operand, value) {
            var values = value.split(",");
            return "( \"{0}\" < {1} OR \"{0}\" > {2} )".format(attr, values[0], values[1]);
          }
        }
      ]
    }

    var layers = [];
    projectProvider.layers.list.forEach(function(layer, index) {
      if (layer.queryable) {
        var attributes = [];
        layer.attributes.forEach(function(attr) {
          attributes.push({
            label: attr.alias || attr.name,
            //type: attr.type,
            name: attr.name,
            comparators: comparators[attr.type]
          });
        });
        layers.push({
          name: layer.name,
          index: index,
          attributes: attributes,
          features: []
        });
      }
    });
    $scope.layers = layers;

    var activeLayerIndex;
    $scope.setActiveLayer = function (layer) {
      if (activeLayerIndex != layer.index) {
        console.log('setActiveLayer: '+layer.name)
        activeLayerIndex = layer.index;
        if (!layer.features.length) {
          $scope.search();
        }
        featuresViewer.setActiveFeaturesLayer(layer.name);
      }
    };

    $scope.selectFeature = function (feature) {
      featuresViewer.selectFeature(feature);
      $scope.selectedFeature = feature;
    };

    $scope.zoomToFeature = function (feature) {
      featuresViewer.zoomToFeature(feature);
    }

    function fetchFeatures (query) {
      var layername = $scope.layers[$scope.tool.layerIndex].name;
      console.log('fetchFeatures: '+layername);
      var params = {
        'SERVICE': 'WMS',
        'VERSION': '1.1.1',
        'REQUEST': 'GetFeatureInfo',
        'INFO_FORMAT': 'application/vnd.ogc.gml',
        'FEATURE_COUNT': $scope.tool.limit,
        //projectProvider.config.projection.code
        'SRS': projectProvider.map.getView().getProjection().getCode(),
        'LAYERS': layername,
        'QUERY_LAYERS': layername,
        'FILTER': query? query : layername+':'
      };
      if ($scope.tool.searchInExtent) {
        var mapSize = projectProvider.map.getSize();
        params['BBOX'] = projectProvider.map.getView().calculateExtent(mapSize).join(',');
      }
      var result = [];
      for (var name in params) {
        if (params.hasOwnProperty(name)) {
          result.push("{0}={1}".format(
            encodeURIComponent(name),
            encodeURIComponent(params[name])
          ));
        }
      }

      var url = projectProvider.config.ows_url+'&'+result.join("&");
      var featureType = 'qgs:'+layername.replace(' ', '');
      console.log('fetch features request');
      
      $scope.progress = gislabClient.get(url).then(function (data) {
        var gml = new ol.format.GML2({
          featureNS: {'qgs': 'http://qgis.org/gml'},
          featureType: featureType
        });
        var features = gml.readFeatures(data);
        var layersFeatures = {};
        layersFeatures[layername] = features;
        featuresViewer.setLayersFeatures(layersFeatures);
        $scope.layers[$scope.tool.layerIndex].features = features;
      });
    };

    $scope.search = function() {
      var layer = $scope.layers[$scope.tool.layerIndex];
      var attributes_queries = [];
      layer.attributes.forEach(function (attribute) {
        if (attribute.filterValue) {
          attributes_queries.push(
            attribute.comparator.encode(
              attribute.name,
              attribute.comparator.operand,
              attribute.filterValue)
          );
        }
      });
      var query_filter = '{0}:{1}'.format(
        layer.name,
        attributes_queries.join(' {0} '.format('AND'))
      );
      console.log(query_filter);
      fetchFeatures(query_filter);
    };

    $scope.$on("$destroy", function() {
      console.log('SearchController: DESTROY');
      featuresViewer.setActiveFeaturesLayer('');
      featuresViewer.selectFeature(null);
    });
  };
})();
