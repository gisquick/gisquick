(function() {
  'use strict';

  angular
    .module('gl.layersControl')
    .controller('LayersController', LayersController);

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

    $scope.topicDetail = function(topic, fn) {
      if (!topic.detail) {
        //var task = $q.defer();
        console.log('topicDetail: '+topic.title);
        //$timeout(function() {
          topic.detail = {
            abstract: topic.abstract,
            visibleLayers: visibleLayersHtml(projectProvider.layers.tree, topic)
          }
          //task.resolve();
        //});
        //return task.promise;
      } else {
        //return $q.when();
      }
    }

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

    $scope.layersVisibilityChanged = function() {
      $scope.selectedTopic.index = null;
      var visible_layers = [];
      projectProvider.layers.list.forEach(function(layer_data) {
        if (!layer_data.isGroup && layer_data.visible) {
          visible_layers.push(layer_data.name);
        }
      });
      layersControl.setVisibleLayers(projectProvider.map, visible_layers);
    };
    $scope.layers = projectProvider.layers.tree;
    $scope.baseLayers = projectProvider.baseLayers.tree;
  };
})();
