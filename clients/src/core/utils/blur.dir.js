(function() {
  'use strict';

  angular
    .module('gl.utils')
    .directive('glBlurOnClick', glBlurOnClick);

  function glBlurOnClick() {
    return {
      restrict: 'A',
      link: function (scope, iElem, iAttrs) {
        iElem.on('click', function() {
          if (document.activeElement.tagName === 'INPUT') {
            document.activeElement.blur();
          }
        })
      }
    }
  }

})();
