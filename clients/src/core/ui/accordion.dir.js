(function() {
  'use strict';

  angular
  .module('gl.ui')
  .directive('glAccordion', glAccordion)
  .directive('glAccordionItem', glAccordionItem)
  .directive('glAccordionContent', glAccordionContent)
  .directive('glCollapsible', glCollapsible)
  .directive('glCollapsibleContent', glCollapsibleContent)
  //.directive('glSplitter', glSplitter);


  function glSplitter($timeout) {
    return {
      scope: false,
      link: function(scope, iElem, iAttrs) {
        console.log('---- splitter ----');
        var elem = iElem.parent();
        var containerTop, containerHeight;
        var moveHandler = function(evt) {
          var flex1 = 100*(evt.clientY-containerTop)/containerHeight;
          //flex1 = Math.round(flex1);
          //console.log(containerTop+' '+containerHeight);
          $timeout(function() {
            scope.ui.panelTop.flex = flex1;
            scope.ui.panelBottom.flex = 100-flex1;
          });
        };
        var resizeEndHandler = function(evt) {
          console.log('mouseup / out');
          elem.removeClass('no-anim');
          elem.off('mousemove touchmove', moveHandler);
          elem.off('mouseup', resizeEndHandler);
          $timeout(function() {
            scope.ui.panelTop.open = true;
            scope.ui.panelBottom.open = true;
          });
        };

        elem.on('mousedown', function(evt) {
          if (iElem[0] !== evt.target) {
            return;
          }
          containerTop = evt.target.parentElement.offsetTop;
          containerHeight = evt.target.parentElement.scrollHeight;
          elem.addClass('no-anim');
          elem.on('mousemove touchmove', moveHandler);
          elem.on('mouseup', resizeEndHandler);
        });
      }
    };
  }

  function collapseElement(animateCss, elem) {
    var height = elem[0].scrollHeight;
    elem.css('maxHeight', height+'px');
    var animator = animateCss(elem, {
      from: {
        maxHeight: height+'px',
        opacity: 1
      },
      to: {
        maxHeight: '0px',
        opacity: 0
      },
      easing: 'ease-out',
      duration: 0.4
    });
    animator.start()
  }

  function expandElement(animateCss, elem) {
    var height = elem[0].scrollHeight;
    var animator = animateCss(elem, {
      from: {
        maxHeight: '0px',
        opacity: 0
      },
      to: {
        maxHeight: height + 'px',
        opacity: 1
      },
      easing: 'ease-out',
      duration: 0.4
    });
    animator.start().done(function() {
      elem.css('maxHeight', 'none');
    });
  }

  function glAccordion($animateCss) {
    return {
      scope: false,
      controller: function($scope) {
        this.expandedAccordion = null;
        this.collapseAccordion = function(accordion) {
          collapseElement($animateCss, accordion.element);
          accordion.expanded = false;
          this.expandedAccordion = null;
        };
        this.expandAccordion = function(accordion) {
          if (this.expandedAccordion) {
            this.collapseAccordion(this.expandedAccordion);
          }
          expandElement($animateCss, accordion.element);
          accordion.expanded = true;
          this.expandedAccordion = accordion;
        };
        this.toggleAccordion = function(accordion) {
          if (accordion.expanded) {
            this.collapseAccordion(accordion);
          } else {
            this.expandAccordion(accordion);
          }
        };

        $scope.$closeAccordion = function() {
          if (this.expandedAccordion) {
            this.collapseAccordion(this.expandedAccordion);
          }
        }.bind(this);
      }
    };
  }

  function glAccordionItem() {
    return {
      scope: true,
      require: '^glAccordion',
      controller: function($scope) {
        $scope.$accordion = {
          expanded: false,
          toggle: angular.noop
        };
      },
      link: function(scope, iElem, iAttrs, accordionController) {
        scope.$accordion['toggle'] = function() {
          accordionController.toggleAccordion(scope.$accordion);
        };
      }
    };
  }

  function glAccordionContent() {
    return {
      restrict: 'EA',
      link: function(scope, iElem, iAttrs) {
        iElem.css('overflow', 'hidden');
        iElem.css('minHeight', '0');
        iElem.css('maxHeight', 0);
        scope.$accordion['element'] = iElem;
      }
    };
  };

  function glCollapsible($animateCss) {
    return {
      restrict: 'EA',
      scope: true,
      require: '?ngModel',
      controller: function($scope) {
        $scope.$collapsible = {
          collapsed: false,
          collapse: function() {
            collapseElement($animateCss, $scope.$collapsible.element);
            $scope.$collapsible.collapsed = true;
          },
          expand: function() {
            expandElement($animateCss, $scope.$collapsible.element);
            $scope.$collapsible.collapsed = false;
          },
          toggle: function() {
            if ($scope.$collapsible.collapsed) {
              $scope.$collapsible.expand();
            } else {
              $scope.$collapsible.collapse();
            }
          },
        };
      },
      link: function(scope, iElem, iAttrs, ngModelCtrl) {
        if (iAttrs.ngModel) {
          scope.$collapsible.collapsed = !scope.$eval(iAttrs.ngModel);
          var collapse = scope.$collapsible.collapse;
          var expand = scope.$collapsible.expand;
          // remove functions for controlling collapsed state
          // when ngModel is defined
          delete scope.$collapsible.collapse;
          delete scope.$collapsible.expand;
          delete scope.$collapsible.toggle;
          var handleOpenChange = function(open) {
            if (open && scope.$collapsible.collapsed) {
              expand();
            }
            if (!open && !scope.$collapsible.collapsed) {
              collapse();
            }
          }
          scope.$watch(iAttrs.ngModel, handleOpenChange);
          if (scope.$collapsible.collapsed) {
            scope.$collapsible.element.css('maxHeight', 0);
          }
        }
      }
    };
  }

  function glCollapsibleContent() {
    return {
      restrict: 'EA',
      link: function(scope, iElem, iAttrs) {
        iElem.css('overflow', 'hidden');
        iElem.css('minHeight', '0');
        scope.$collapsible['element'] = iElem;
      }
    };
  };

})();
