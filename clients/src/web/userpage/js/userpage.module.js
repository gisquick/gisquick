(function() {
  'use strict';
  angular
    .module('templates', []); // module for compiled templates
  angular
    .module('gl.userpage', [
      'templates',
      'ngMaterial',
      'gl.network',
      'gl.utils',
      'gl.ui'
    ]);
})();
