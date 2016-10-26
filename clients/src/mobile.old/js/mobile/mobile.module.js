(function() {
  'use strict';

  angular
    .module('gl.mobile', [
      'onsen',
      //'ngTouch',
      'ngStorage',
      'gl.ui',
      'gl.mobile.ui',
      'gl.utils',
      'gl.network',
      'gl.map',
      'gl.legend',
      'gl.layersControl',
      'gl.location'
    ]);
})();
