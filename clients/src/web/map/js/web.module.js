(function() {
  'use strict';
  angular
    .module('templates', []); // module for compiled templates
  angular
    .module('gl.web', [
      'templates',
      'ngMaterial',
      'gl.network',
      'gl.utils',
      'gl.ui',
      'gl.map',
      'gl.tools',
      'gl.legend',
      'gl.layersControl',
      'gl.features',
      'gl.measure',
      'gl.print',
      'gl.location',
      'gl.opacity'
    ]);
})();
