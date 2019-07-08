(function() {
  'use strict';

  angular
    .module('gl.tools')
    .factory('toolsManager', toolsManager);

  function toolsManager(projectProvider) {

    function ToolsManager() {
      this.activeTool = null;
      this.backgroundActiveTool = null;
      this.tools = [];
    };

    ToolsManager.prototype.addTool = function(config) {
      this.tools.push(config);
    };

    ToolsManager.prototype.get = function(name) {
      for (var i = 0; i < this.tools.length; i++) {
        var tool = this.tools[i];
        if (tool.name === name) {
          return tool;
        }
      }
    };

    ToolsManager.prototype.backgroundActivateTool = function(tool) {
      this.backgroundActiveTool = tool;
      this.backgroundActiveTool.backgroundActivate();
    };

    ToolsManager.prototype.backgroundDeactivateTool = function() {
      this.backgroundActiveTool = null;
      this.backgroundActiveTool.deactivate();
    };

    ToolsManager.prototype.activateTool = function (tool) {
      if (this.backgroundActiveTool) {
        this.backgroundActiveTool.deactivate();
      }
      if (this.activeTool) {
        this.activeTool.deactivate();
      }
      this.activeTool = tool;
      this.activeTool.activate();
    };

    ToolsManager.prototype.deactivateTool = function() {
      if (this.activeTool) {
        this.activeTool.deactivate();
        this.activeTool = null;
      }
      if (this.backgroundActiveTool) {
        this.backgroundActiveTool.backgroundActivate();
      }
    };


    ToolsManager.prototype.setScaleLineVisibility = function(visible) {
      var control = projectProvider.map.getControlByClass(ol.control.ScaleLine);
      control.setMap(visible? projectProvider.map : null);
    };

    ToolsManager.prototype.setAttributionsVisibility = function(visible) {
      var control = projectProvider.map.getControlByClass(ol.control.Attribution);
      control.setCollapsed(!visible);
    };

    ToolsManager.prototype.setZoomControlsVisibility = function(visible) {
      var control = projectProvider.map.getControlByClass(ol.control.Zoom);
      control.setMap(visible? projectProvider.map : null);
    };

    return new ToolsManager();
  };
})();
