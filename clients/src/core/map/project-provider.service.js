(function() {
  'use strict';

  angular
    .module('gl.map')
    .factory('projectProvider', projectProvider);

  /**
   * Holds information about project loaded by Gisquick application
   * through theese attributes:
   *  - data {object} project data
   *  - map {ol.Map}
   *  - baseLayers.tree {object} base layers in a tree structure
   *  - baseLayers.list {Array.<object>} flat list of base layers (without groups)
   *  - layers.tree {object} overlay layers in a tree structure
   *  - layers.list {Array.<object>} flat list of overlay layers (without groups)
   */
  function projectProvider(Observable, mapBuilder) {
    /**
     * @constructor
     */
    function ProjectProvider() {
      Observable.call(this, ["projectDataAvailable", "projectLoaded", "projectClosed", "mapInitialized"]);
      this.map = null;
      this.baseLayers = {
        tree: {},
        list: []
      };
      this.layers = {
        tree: {},
        list: []
      }
    }

    ProjectProvider.prototype = Object.create(Observable.prototype);

    /**
     * Set or unset project data
     * @param {object} data Gisquick project data, or null
     */
    ProjectProvider.prototype.setProjectData = function(data) {
      if (data !== null) {
        this.data = data;
        this.dispatchEvent('projectDataAvailable', data);
      } else {
        var data = this.data;
        this.data = null;
        this.dispatchEvent('projectClosed', data);
      }
    };

    /**
     * Loads Gisquick project and initialize ol3 map.
     * @param {object} project config
     */
    ProjectProvider.prototype.loadProject = function() {
      if (this.map) {
        this.map.setTarget();
      }
      var config = this.data;
      this.baseLayers.tree = config.base_layers;
      this.baseLayers.list = mapBuilder.layersTreeToList({layers: this.baseLayers.tree}, true);
      this.layers.tree = config.layers;
      this.layers.list = mapBuilder.layersTreeToList({layers: this.layers.tree}, true);

      // when no base layers is visible, set first to be visible
      var visibleBaseLayer = this.baseLayers.list.some(function(layerModel) {
        if (layerModel.visible) {
          return true;
        }
      });
      if (!visibleBaseLayer) {
        this.baseLayers.list[0].visible = true;
      }
      this.layers.list.concat(this.baseLayers.list).forEach(function(layer_data) {
        if (!layer_data.isGroup) {
          if (config.scales) {
            if (!angular.isDefined(layer_data.visibility_scale_max)) {
              layer_data.visibility_scale_max = config.scales[0];
            }
            if (!angular.isDefined(layer_data.visibility_scale_min)) {
              layer_data.visibility_scale_min = config.scales[config.scales.length-1];
            }
          }
        }
      });

      this.map = mapBuilder.createMap(config);
      this.dispatchEvent('projectLoaded');
    };
    return new ProjectProvider();
  };
})();
