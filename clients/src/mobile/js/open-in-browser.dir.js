(function() {
  'use strict';

  angular
    .module('gl.mobile')
    .directive('glOpenInBrowser', glOpenInBrowser);

  function glOpenInBrowser() {
    return {
      restrict: 'A',
      link: function (scope, iElem, iAttrs) {
        iElem.on('click', function(event) {
          window.open(iAttrs.glOpenInBrowser, '_system', 'location=yes');
        });
      }
    };
  };
})();
