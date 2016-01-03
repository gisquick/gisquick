(function() {
  'use strict';

  angular
  .module('gl.ui')
  .directive('glScrollbarDetector', glScrollbarDetector);

  function glScrollbarDetector($timeout) {
    return {
      scope: false,
      link: function(scope, iElem, iAttrs, ctrl) {
        $timeout(function() {
          if (iElem[0].scrollWidth > iElem[0].clientWidth) {
            iElem.addClass('horizontal-overflow');
          }
          if (iElem[0].scrollHeight > iElem[0].clientHeight) {
            iElem.addClass('vertical-overflow');
          }
        });
      }
    }
  }
})();
