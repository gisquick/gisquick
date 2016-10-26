(function() {
  'use strict';

  angular
    .module('gl.mobile', [
      //'ngTouch',
      'ngStorage',
      'templates',
      'ngMaterial',
      'gl.web', // TODO: remove
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
      'gl.location'
    ]);
})();
