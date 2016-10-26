(function() {
  'use strict';

  angular
  .module('gl.mobile.ui')
  .directive('glTabModel', function() {
    return {
      controller: function($scope) {}
    }
  })
  .directive('glCarousel', function() {
    return {
      controller: function($scope) {}
    }
  })
  .directive('glCarouselTabSlider', glCarouselTabSlider);

  function glCarouselTabSlider() {
    return {
      restrict: 'E',
      require: ['glTabModel' ,'glCarousel'],
      template: '<div class="carousel-slider-bg"><div class="carousel-slider"></div></div>',
      replace: true,
      scope: true,
      transclude: false,
      controller: function($scope, $timeout, $parse) {
        $scope.setupSlider = function(carousel, slider, tabModel) {
          $timeout(function() {
            var carouselItemsCount = carousel._element.children().length;
            var tabGetter = $parse(tabModel);
            var tabSetter = tabGetter.assign;
            $scope.$watch(tabModel, function(value) {
              carousel.setActiveCarouselItemIndex(value);
            });
            
            var carouselWidth = carousel._element[0].clientWidth;
            var sliderBasePosition = (carousel.getActiveCarouselItemIndex() * carouselWidth)/carouselItemsCount;

            var sliderWidth = '{0}%'.format(100.0/carouselItemsCount);
            slider.setAttribute("style", "width: {width};".replace('{width}', sliderWidth));
            var noanim_template = "width: {width};\
              transform: translate3d({0}px, 0px, 0px);\
              -webkit-transform: translate3d({0}px, 0px, 0px);\
              -webkit-transition: all 0 ease 0".replace('{width}', sliderWidth);
            var anim_template = "width: {width};\
              transform: translate3d({0}px, 0px, 0px);\
              -webkit-transform: translate3d({0}px, 0px, 0px);\
              -webkit-transition: all 0.3s cubic-bezier(0.1, 0.7, 0.1, 1) 0s".replace('{width}', sliderWidth);

            carousel.on('postchange', function(e) {
              carouselWidth = carousel._element[0].clientWidth;
              $timeout(function() {
                tabSetter($scope, e.activeIndex);
              });
              sliderBasePosition = (e.activeIndex * carouselWidth)/carouselItemsCount;
              var style = anim_template.format(sliderBasePosition);
              slider.setAttribute("style", style);
              
            });
            carousel._element.on('drag', function(e) {
              var x = sliderBasePosition - e.gesture.deltaX/carouselItemsCount;
              if (x > 0 && x < (carouselWidth/carouselItemsCount) * (carouselItemsCount -1)) {
                var style = noanim_template.format(x);
                slider.setAttribute("style", style);              
              }

            });
            carousel._element.on('dragend', function(e) {
              carouselWidth = carousel._element[0].clientWidth;
              //console.log(Math.abs(e.gesture.deltaX) / carouselWidth);
              if (Math.abs(e.gesture.deltaX) / carouselWidth < carousel.getAutoScrollRatio()) {
                var x = sliderBasePosition;
                var style = anim_template.format(x);
                slider.setAttribute("style", style);
              } else {
                // var x;
                // if (e.gesture.deltaX > 0) {
                //  x = sliderBasePosition - carouselWidth/carouselItemsCount;
                // } else {
                //  x = sliderBasePosition + carouselWidth/carouselItemsCount;
                // }
                // var style = anim_template.format(x);
                // slider.setAttribute("style", style);
              }
            });
            carousel.setActiveCarouselItemIndex(tabGetter($scope));
          });
        }
      },
      link: function(scope, iElement, iAttrs, ctrl) {
        setImmediate(function() {
          var carousel = scope.$eval(iAttrs.glCarousel);
          scope.setupSlider(carousel, iElement[0].children[0], iAttrs.glTabModel);
        });
      }
    };
  };
})();
