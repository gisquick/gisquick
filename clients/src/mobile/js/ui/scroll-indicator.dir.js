(function() {
  'use strict';

  angular
  .module('gl.mobile.ui')
  .directive('glOrientation', function() {
    return {
      controller: function($scope) {}
    }
  })
  .directive('glScrollOffset', function() {
    return {
      controller: function($scope) {}
    }
  })
  .directive('glScrollIndicator', glScrollIndicator)
  .directive('glFocusAutoScroll', glFocusAutoScroll);

  function glScrollIndicator() {
    return {
      restrict: 'E',
      template: '<ng-transclude></ng-transclude>',
      require: 'glOrientation',
      transclude: true,
      replace: true,
      scope: {},
      controller: function($scope) {
        $scope.setupIndicator = function(scroller, indicator, orientation) {
          if (orientation === 'top') {
            $scope.updateIndicator = function() {
              var opacity;
              if (scroller.scrollTop > 20) {
                opacity = 1.0;
              } else {
                //(0 - 20) => (0.0 - 1.0)
                opacity = scroller.scrollTop/20.0;
              }
              indicator.setAttribute('style', 'opacity: {0};'.format(opacity));
            }
          } else if (orientation === 'bottom') {
            $scope.updateIndicator = function() {
              var opacity;
              var delta = scroller.children[0].clientHeight - scroller.clientHeight - scroller.scrollTop;
              if (delta > 1) {
                if (delta < 20) {
                  // (20 - 0) -> (1.0 - 0.0)
                  opacity = delta/20.0;
                } else {
                  opacity = 1;
                }
              } else {
                opacity = 0.0;
              }
              indicator.setAttribute('style', 'opacity: {0};'.format(opacity));
            }
          }
          scroller.addEventListener('scroll', function() {
            $scope.updateIndicator();
          });
        };
      },
      link: function(scope, element, attrs, ctrl) {
        var scroller = element.parent().parent()[0];
        var indicator = element[0];
        indicator.setAttribute('style', 'opacity: 0;');
        scope.setupIndicator(scroller, indicator, attrs.glOrientation);
        if (attrs.glUpdateOn) {
          scope.$parent.$watch(attrs.glUpdateOn, function(value) {
            setTimeout(function() {
              scope.updateIndicator();
            }, 5);
            
          });
        } else {
          setTimeout(function() {
            scope.updateIndicator();
          }, 50);
        }
      }
    };
  };

  function glFocusAutoScroll() {
    return {
      restrict: 'A',
      link: function(scope, element, attrs, ctrl) {
        var offset = parseInt(attrs.glScrollOffset) || 0;
        element.on('focus', function(evt, el) {
          setTimeout(function() {
            var scroll = element[0].getBoundingClientRect().top;
            var listElem = element[0].parentElement;
            while (listElem.tagName !== 'ONS-LIST') {
              listElem = listElem.parentElement;
            }
            var scrollerElem = listElem.parentElement;
            while (scrollerElem.tagName !== 'ONS-SCROLLER') {
              scrollerElem = scrollerElem.parentElement;
            }
            var scroll = element[0].getBoundingClientRect().top - listElem.getBoundingClientRect().top;
            scrollerElem.scrollTop = scroll + offset;
          }, 500);
        });
      }
    };
  };
})();
