(function() {
  'use strict';

  angular
    .module('gl.layersControl')
    .controller('LayersController', LayersController)
    .controller('OverlaysController', OverlaysController);

  function OverlaysController($scope, $timeout, $q, projectProvider, mapBuilder, layersControl, toolsManager) {

    var layerAttributesTool;
    $scope.showAttributeTable = function(layer) {
      if (!layerAttributesTool) {
        layerAttributesTool = toolsManager.get('attribute_table')
        $scope.tool = layerAttributesTool;
      }

      if (!toolsManager.activeTool || toolsManager.activeTool.name !== 'attribute_table') {
        toolsManager.activateTool(layerAttributesTool);
      }
      layerAttributesTool.showTable(layer);
    };

    $scope.highlightItem = function($event) {
      // highlight layer item when clicked on checkbox
      $event.target.parentNode.parentNode.parentNode.focus();
    }
  }

  function LayersController($scope, $timeout, $sce, $q, projectProvider, mapBuilder, layersControl) {
    $scope.topics = projectProvider.data.topics;
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
      var layers = topic.visible_overlays.concat(hiddenLayers);
      layersControl.setVisibleLayers(projectProvider.map, layers);
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


    var hiddenLayers = [];
    function collectHiddenLayers(layersGroup) {
      layersGroup.forEach(function(layer) {
        if (layer.layers && layer.visible) {
          collectHiddenLayers(layer.layers);
        } else if (layer.hidden) {
          hiddenLayers.push(layer.name);
        }
      });
    }

    $scope.layersVisibilityChanged = function(node) {
      $scope.selectedTopic.index = null;
      // update list of hidden layers when group visibility was changed
      if (node && node.isGroup) {
        node.data.visible = node.isEnabled;
        hiddenLayers = [];
        collectHiddenLayers(projectProvider.layers.tree);
      }
      var visibleLayers = [].concat(hiddenLayers);
      projectProvider.layers.list.forEach(function(layer_data) {
        if (layer_data.visible) {
          visibleLayers.push(layer_data.name);
        }
      });
      layersControl.setVisibleLayers(projectProvider.map, visibleLayers);
    };

    collectHiddenLayers(projectProvider.layers.tree);
    if (hiddenLayers.length > 0) {
      $scope.layersVisibilityChanged();
    }

    $scope.layers = projectProvider.layers.tree;
    $scope.baseLayers = projectProvider.baseLayers.tree;
  };
})();
