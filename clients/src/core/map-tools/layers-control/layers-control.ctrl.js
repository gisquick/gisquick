(function() {
  'use strict';

  angular
    .module('gl.layersControl')
    .controller('LayersController', LayersController)
    .controller('OverlaysController', OverlaysController);

  function OverlaysController($scope, $timeout, $q, projectProvider, mapBuilder, layersControl, $mdBottomSheet) {
    console.log('--- OverlaysController ---');

    $scope.onpagechange = function(page, limit) {
      console.log('onpagechange');
    };

    var queryableLayersIndexes = {};
    projectProvider.layers.list.forEach(function(layer_data, index) {
      queryableLayersIndexes[layer_data.name] = index;
    });

    var layerAttributesTool = {
      rowsPerPage: 5,
      limit: 50,
      opened: false,
      showTable: function(layer) {
        var tool = this;
        layerAttributesTool.layerIndex = queryableLayersIndexes[layer.name];
        console.log('opening attributes table');
        if (!tool.opened) {
          var sheetPromise = $mdBottomSheet.show({
            templateUrl: 'templates/tools/attribute_table.html',
            disableParentScroll: false,
            hasBackdrop: false,
            parent: '.bottom-bar',
            controller: 'AttributeTableController',
            locals: {tool: layerAttributesTool}
          });
          tool.opened = true;
          sheetPromise.then(function() {
            tool.opened = false;
          });
          sheetPromise.catch(function() {
            tool.opened = false;
          });
        }
      },
      deactivate: function() {
        $mdBottomSheet.hide();
      }
    };

    $scope.showAttributeTable = function(layer) {
      console.log('showAttributeTable');
      layerAttributesTool.showTable(layer);
    };
  }

  function LayersController($scope, $timeout, $sce, $q, projectProvider, mapBuilder, layersControl) {
    $scope.topics = projectProvider.config.topics;
    $scope.selectedTopic = {};

    function visibleLayersHtml(layersTreeModel, topic) {
      var text = '';
      var indent = '';
      var visit_node = function(layerModel) {
        if (layerModel.layers) {
          indent += '&nbsp;&nbsp;';
          var children_content = [];
          layerModel.layers.forEach(function(childModel) {
            var child_content = visit_node(childModel);
            if (child_content) {
              children_content.push(child_content);
            }
          });
          indent = indent.slice(12);
          if (children_content.length > 0) {
            return indent+'<label class="layer-group">'+layerModel.title+'</label><br />'+children_content.join('');
          }
        } else if (topic.visible_overlays.indexOf(layerModel.name) != -1) {
          return '<span>'+indent+'- '+layerModel.title+'</span><br />';
        }
      };
      var html = [];
      layersTreeModel.forEach(function(layerModel) {
        html.push(visit_node(layerModel));
      });
      return $sce.trustAsHtml(html.join('\n'));
    }

    $scope.topics.forEach(function(topic) {
      topic.detail = {
        abstract: topic.abstract,
        visibleLayers: visibleLayersHtml(projectProvider.layers.tree, topic)
      }
    });

    $scope.loadTopic = function(index) {
      var topic = $scope.topics[index];
      layersControl.setVisibleLayers(projectProvider.map, topic.visible_overlays);
      projectProvider.layers.list.forEach(function(layerModel) {
        layerModel.visible = topic.visible_overlays.indexOf(layerModel.name) != -1;
      });
      $scope.$broadcast('layersChanged');
    }

    $scope.setBaseLayer = function(layername) {
      if (!projectProvider.map)
        return;
      layersControl.setBaseLayer(projectProvider.map, layername);
    };

    $scope.getVisibleBaseLayer = function() {
      var name = layersControl.getVisibleBaseLayer(projectProvider.map).get('name');
      return name;
    }

    $scope.layersVisibilityChanged = function(node) {
      console.log('layersVisibilityChanged 1');
      console.log(node);
      //$scope.selectedTopic.index = null;
      var visibleLayers = [];
      projectProvider.layers.list.forEach(function(layer_data) {
        if (!layer_data.isGroup && layer_data.visible) {
          visibleLayers.push(layer_data.name);
        }
      });
      console.log(visibleLayers);
      layersControl.setVisibleLayers(projectProvider.map, visibleLayers);
    };

    $scope.layers = projectProvider.layers.tree;
    $scope.baseLayers = projectProvider.baseLayers.tree;
  };
})();
