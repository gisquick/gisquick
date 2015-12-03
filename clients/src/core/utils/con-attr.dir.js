(function() {
  'use strict';

  angular
    .module('gl.utils')
    .directive('glConAttr', glConAttr);

  function glConAttr() {
    return {
      restrict: 'A',
      link: function (scope, iElem, iAttrs) {
        var conditional_attributes = scope.$eval(iAttrs.glConAttr);
        for (var attr_name in conditional_attributes) {
          if (conditional_attributes[attr_name] === true) {
            iAttrs.$set(attr_name, 'true');
          }
        }
      }
    };
  };
})();
