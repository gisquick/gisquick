(function() {
  'use strict';

  angular
  .module('gl.ui')
  .directive('rcDrag', rcDragDirective)

  function rcDragDirective($window, $document) {

    var moveThreshold = 100;

    var documentListenersActive = false;
    var rAFPending = false;
    var mouseStart = null;
    var mouseLast = null;
    var mouseDelta = {x: 0, y: 0};
    var offset = {x: 0, y: 0};
    var target;

    function setupDocumentListeners() {
      if (!documentListenersActive) {
        $document.on('mousemove', mousemove);
        $document.on('mouseup', mouseup);
        documentListenersActive = true;
      }
    }

    function takedownDocumentListeners() {
      if (documentListenersActive) {
        $document.off('mousemove', mousemove);
        $document.off('mouseup', mouseup);
        documentListenersActive = false;
      }
    }

    function updateViewport() {
      target.css('transform', 'translate('+ (offset.x + mouseDelta.x) +'px,'+ (offset.y + mouseDelta.y) +'px)');
    }

    function requestUpdateViewport() {
      if (!rAFPending) {
        $window.requestAnimationFrame(function() {
          updateViewport();
          rAFPending = false;
        });
        rAFPending = true;
      }
    }

    function mousedown(ev) {
      mouseStart = {x: ev.pageX, y: ev.pageY};
      mouseLast = mouseStart;
      setupDocumentListeners();
    }

    function mousemove(ev) {
      if (mouseLast === null || Math.abs(ev.pageX - mouseLast.x) > moveThreshold || Math.abs(ev.pageY - mouseLast.y) > moveThreshold) {
        mouseStart = null;
        mouseup();
      }
      else {
        mouseLast = {x: ev.pageX, y: ev.pageY};
        mouseDelta = {x: (ev.pageX - mouseStart.x), y: (ev.pageY - mouseStart.y)};
        requestUpdateViewport();
      }
      ev.stopPropagation();
      ev.preventDefault();
    }

    function mouseup() {
      if (mouseStart !== null) {
        offset.x += mouseDelta.x;
        offset.y += mouseDelta.y;
        mouseDelta = {x: 0, y: 0};
      }
      mouseStart = null;
      mouseLast = null;
      takedownDocumentListeners();
    }

    function link(scope, elem, attrs) {
      target = elem.parent();
      var initTransform = target.css('transform');
      if (initTransform) {
        var re = /translate\((.+)\)/
        var match = initTransform.match(re)
        if (match) {
          var coords = match[1].split(',').map(parseFloat);
          offset.x = coords[0];
          offset.y = coords[1];
        }
      }

      angular.element(elem[0].querySelector(attrs.rcDrag)).bind('mousedown', mousedown);
      // elem.bind('mousedown', mousedown);

      scope.$on('$destroy', function() {
        takedownDocumentListeners();
      });
    }

    return {
      restrict: 'A',
      link: link
    };
  }

})();