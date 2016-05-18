(function() {
  'use strict';

  angular
    .module('gl.tools')
    .factory('toolsManager', [toolsManager]);

  function toolsManager() {

    function ToolsManager() {
      this.activeTool = null;
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

    ToolsManager.prototype.activateTool = function(tool) {
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
    };

    return new ToolsManager();
  };
})();
