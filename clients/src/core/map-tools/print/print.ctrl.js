(function() {
  'use strict';

  angular
    .module('gl.print')
    .controller('PrintController', PrintController);

  function PrintController($scope, $timeout, $compile, $templateCache, $http, projectProvider, layersControl, gislabClient) {
    var tool = $scope.tool;

    function createPrintParameters(layout, layers, extent, options) {
      var config = tool.config;
      var params = {
        'SERVICE': 'WMS',
        'REQUEST': 'GetPrint',
        'TEMPLATE': layout.name,
        'DPI': config.dpi,
        'FORMAT': config.format,
        'SRS': projectProvider.config.projection.code,
        'LAYERS': layers.join(','),
        'map0:EXTENT': extent.join(','),
        'map0:SCALE': $scope.mapScale,
        'map0:ROTATION': config.rotation,

        'gislab_project': tool.config.title,
        'gislab_author': tool.config.author,
        'gislab_contact': tool.config.contact,
        'gislab_copyrights': tool.config.copyrights
        // gislab_copyrights: String.format('<div style="background-color:rgba(255,255,255,0.3);position:absolute;bottom:0;right:0;padding-left:8px;padding-right:8px;font-family:Liberation Sans;">{0}</div>', Ext.util.Format.htmlEncode(attributions.join(', ')))
      };
      angular.extend(params, options);
      return params;
    }

    function getPrintParameters() {
      var layout = tool.config.layout;
      var templateImageElem = tool._previewElem.find('print-layout').splice(0).find(function(elem) {
        return elem.clientWidth > 0;
      });

      var width = templateImageElem.clientWidth;
      var height = templateImageElem.clientHeight;
      var left = templateImageElem.offsetLeft + (layout.map.x/layout.width)*width;
      var top = templateImageElem.offsetTop + (layout.map.y/layout.height)*height;
      var right = left+(layout.map.width/layout.width)*width;
      var bottom = top+(layout.map.height/layout.height)*height;

      left = left * tool.config._previewScale;
      right = right * tool.config._previewScale;
      top = top * tool.config._previewScale;
      bottom = bottom * tool.config._previewScale;

      console.log([width, height]);
      console.log([left, top, right, bottom]);

      var leftTop = projectProvider.map.getCoordinateFromPixel([left, top]);
      var rightBottom = projectProvider.map.getCoordinateFromPixel([right, bottom]);
      var extent = [
        leftTop[0],
        leftTop[1],
        rightBottom[0],
        rightBottom[1]
      ];

      return createPrintParameters(
        layout,
        layersControl.getVisibleLayers(projectProvider.map),
        extent
      );
    }

    function setupPrintLayout(printLayout) {
      var width = parseInt((96 * printLayout.width)/25.4);
      var height = parseInt((96 * printLayout.height)/25.4);
      var mapSize = projectProvider.map.getSize();
      // compute real map size
      mapSize[0] = mapSize[0]/tool.config._previewScale;
      mapSize[1] = mapSize[1]/tool.config._previewScale;
      var mapElem = angular.element(projectProvider.map.getTargetElement());
      if (height > mapSize[1]) {
        // scale print layout preview image and map to fit screen size
        var percScale = (height/mapSize[1])*100;
        percScale = percScale + 10;
        mapElem.css('width', percScale+'%');
        mapElem.css('height', percScale+'%');
        mapElem.css('transform-origin', 'top left');
        mapElem.css('transform', 'scale({0}, {0})'.format(100/percScale));
        tool.config.previewWidth = parseInt(width*(100/percScale))+'px';
        tool.config.previewHeight = parseInt(height*(100/percScale))+'px';

        tool.config._previewScale = percScale/100;
      } else {
        mapElem.css('width', '100%');
        mapElem.css('height', '100%');
        mapElem.css('transform', 'scale(1, 1)');
        tool.config.previewWidth = width+'px';
        tool.config.previewHeight = height+'px';

        tool.config._previewScale = 1.0;
      }
      $timeout(function() {
        projectProvider.map.updateSize();
      }, 200);
    }

    tool.events.layoutChanged = setupPrintLayout;

    // projectProvider.map.getView().setRotation(tool.config.rotation*Math.PI/180);

    var dragListenerKey, dragZoomKey;
    /** Setup scale transformation on all required map mouse events
    used in map controls - when map canvas is resized and scaled down
    to fit print layout area into device screen size. */
    function setupMapEventsTransform() {
      function transformEvent(evt) {
        var x = evt.pixel[0] * tool.config._previewScale;
        var y = evt.pixel[1] * tool.config._previewScale;

        evt.pixel[0] = x;
        evt.pixel[1] = y;
        // evt.pointerEvent.clientX = x
        // evt.pointerEvent.clientY = y;
        // evt.pointerEvent.screenX = x;
        // evt.pointerEvent.screenY = y;
        // evt.browserEvent.clientX = x;
        // evt.browserEvent.clientY = y;
        // evt.browserEvent.screenX = x;
        // evt.browserEvent.screenY = y;
        evt.coordinate = projectProvider.map.getCoordinateFromPixel(evt.pixel);
      }
      // projectProvider.map.on('pointermove', transformEvent);
      // projectProvider.map.on('dblclick', transformEvent);
      // projectProvider.map.on('click', transformEvent);
      // projectProvider.map.on('singleclick', transformEvent);
      dragListenerKey = projectProvider.map.on('pointerdrag', transformEvent);

      function boxStart(evt) {
        // console.log('boxStart');
        var pixel = evt.target.startPixel_;
        pixel[0] = pixel[0] * tool.config._previewScale;
        pixel[1] = pixel[1] * tool.config._previewScale;
        evt.coordinate = projectProvider.map.getCoordinateFromPixel(pixel);
      }
      dragZoomKey = projectProvider.map.getInteractionByClass(ol.interaction.DragZoom).on('boxstart', boxStart);

      var wheelInteraction = projectProvider.map.getInteractionByClass(ol.interaction.MouseWheelZoom);
      wheelInteraction._handleEvent = wheelInteraction.handleEvent;//.bind(wheelInteraction);
      wheelInteraction.handleEvent = function(evt) {
        // console.log('handleEvent');
        transformEvent(evt);
        return wheelInteraction._handleEvent(evt);
      };
    }

    /** Remove all registred event listener used for map mouse events transformation */
    function removeMapEventsTransform() {
      projectProvider.map.unByKey(dragListenerKey);
      projectProvider.map.getInteractionByClass(ol.interaction.DragZoom).unByKey(dragZoomKey);
      var wheelInteraction = projectProvider.map.getInteractionByClass(ol.interaction.MouseWheelZoom);
      wheelInteraction.handleEvent = wheelInteraction._handleEvent;
    }

    function initializePrintPreview() {
      tool.config.layouts.forEach(function(layout) {
        var extent = projectProvider.map.getView().calculateExtent([layout.map.width, layout.map.height]);
        var params = createPrintParameters(
          layout,
          [], // empty map
          extent,
          {'DPI': 96, 'FORMAT': 'png', 'map0:SCALE': '1'}
        );
        layout.templateUrl = gislabClient.encodeUrl(projectProvider.config.ows_url, params);
      });

      $http.get(tool.previewTemplate, {cache: $templateCache})
        .then(function(response) {
          var template = response.data;
          tool._previewElem = angular.element(template);
          $compile(tool._previewElem)($scope);
          angular.element(document.body).append(tool._previewElem);
        });
    }

    tool.events.toolActivated = function() {
      if (tool._previewElem) {
        tool._previewElem.css('display', '');
      } else {
        initializePrintPreview();
      }
      setupMapEventsTransform();
      tool.config._previewScale = 1;
      if (tool.config.layout) {
        setupPrintLayout(tool.config.layout);
      }
    };

    tool.events.toolDeactivated = function() {
      tool._previewElem.css('display', 'none');
      removeMapEventsTransform();
      setupPrintLayout({
        width: 1,
        height: 1
      });
    };

    $scope.print = function() {
      var printParams = getPrintParameters();
      var url = gislabClient.encodeUrl(projectProvider.config.ows_url, printParams);
      var popup;
      function closePrint () {
        if (popup) {
          popup.close();  
        }
      }

      popup = window.open(url);
      popup.onbeforeunload = closePrint;
      popup.onafterprint = closePrint;
      // popup.focus(); // Required for IE
      popup.print();
    };

    $scope.download = function() {
      var printParams = getPrintParameters();
      gislabClient.get(projectProvider.config.ows_url, printParams, {responseType: 'blob'})
        .then(function(data) {
          var link = document.createElement("a");
          link.download = "{0}.{1}".format(tool.config.layout.name, tool.config.format);
          link.href = URL.createObjectURL(data);
          (document.body || document.documentElement).appendChild(link);
          link.click();
          setTimeout(function() {
            (document.body || document.documentElement).removeChild(link);
            URL.revokeObjectURL(link.href);
          }, 10000);
        });
    }
  }
})();
