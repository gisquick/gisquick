(function() {
  'use strict';

  angular
  .module('gl.ui')
  .directive('glScrollbar', glScrollbar)
  .directive('glParentScrollbar', glParentScrollbar);


  function glScrollbar() {
    return {
      scope: false,
      link: function(scope, iElem, iAttrs, ctrl) {
        if (SimpleScrollbar.width > 0) {
          SimpleScrollbar.initEl(iElem[0], iAttrs.glScrollbar);
        } else {
          iElem.css('overflow', 'auto');
        }
      }
    }
  }

  function glParentScrollbar() {
    return {
      scope: false,
      link: function(scope, iElem, iAttrs, ctrl) {
        if (SimpleScrollbar.width > 0) {
          SimpleScrollbar.initEl(iElem.parent()[0], iAttrs.glParentScrollbar);
        } else {
          iElem.parent().css('overflow', 'auto');
        }
      }
    }
  }
})();
