(function() {
  'use strict';

  angular
  .module('gl.ui')
  .directive('glScroller', glScroller);


  function glScroller() {
    return {
      scope: false,
      link: function(scope, iElem, iAttrs, ctrl) {
        if (SimpleScrollbar.width > 0) {
          var scrollElem = iElem.parent()[0];
          SimpleScrollbar.initEl(scrollElem);
        } else {
          iElem.css('overflow', 'auto');
        }
      }
    }
  }

})();
