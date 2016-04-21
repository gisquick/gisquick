(function() {
  'use strict';

  angular
  .module('gl.ui')
  .directive('glProgressBar', glProgressBar);


  function glProgressBar($parse, $q, $timeout) {
    return {
      restrict: 'E',
      scope: true,
      template: '\
        <md-progress-linear\
          ng-show="showProgressBar"\
          md-mode="indeterminate">\
        </md-progress-linear>\
      ',
      controller: function($scope) {
        $scope.showProgressBar = false;
      },
      link: function(scope, iElem, iAttrs) {
        if (iAttrs.promise) {

          var timeoutTask;
          scope.$watch(iAttrs.promise, function(value) {
            if (!angular.isDefined(value)) {
              scope.showProgressBar = false;
              return;
            }
            value = $q.when(value);
            var showTime = new Date();
            if (timeoutTask) {
              $timeout.cancel(timeoutTask);
            }
            scope.showProgressBar = true;
            value.finally(function() {
              var elapsed = new Date() - showTime;
              if (elapsed > 1000) {
                scope.showProgressBar = false; 
              } else {
                timeoutTask = $timeout(function() {
                  scope.showProgressBar = false; 
                  timeoutTask = null;
                }, 1000-elapsed);
              }
            });
          });
        }
      }
    };
  }

})();
