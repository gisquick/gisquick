(function() {
  'use strict';
  angular
    .module('templates', []); // module for compiled templates
  angular
    .module('gl.web', [
      'templates',
      'ngMaterial',
      'md.data.table',
      'gl.network',
      'gl.ui',
      'gl.map',
      'gl.legend',
      'gl.layersControl',
      'gl.features',
      'gl.measure',
      'gl.print'
    ]);
})();
