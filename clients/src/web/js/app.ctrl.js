(function() {
  'use strict';

  angular
    .module('gl.web')
    .controller('AppController', AppController)
    .controller('LayoutAnimationController', LayoutAnimationController)
    .factory('staticResource', function(staticRoot) {
      return function(filename) {
        return staticRoot+filename;
      }
    });

  function LayoutAnimationController($scope, $timeout) {
    $scope.$on('ui.layout.toggle', function(e, container) {
      var layoutElem = container.element.parent();
      layoutElem.addClass('ui-layout-animation');
      $timeout(function() {
        layoutElem.removeClass('ui-layout-animation');
      }, 600);
    });
  }

  function AppController($scope, $timeout, $q, projectProvider, $mdBottomSheet) {
    $scope.ui = {
      toolPanelOpen: true,
      panelTop: {
        flex: 0,
        open: true,
        collapse: function() {
          if ($scope.ui.panelTop.open && $scope.ui.panelBottom.open) {
            $scope.ui.panelTop.expandedFlex = $scope.ui.panelTop.flex;
            $scope.ui.panelBottom.expandedFlex = $scope.ui.panelBottom.flex;
          }
          $scope.ui.panelTop.flex = 5;
          $scope.ui.panelBottom.flex = 95;
          $scope.ui.panelTop.open = false;
          $scope.ui.panelBottom.open = true;
        },
        expand: function() {
          $scope.ui.panelTop.flex = $scope.ui.panelTop.expandedFlex;
          $scope.ui.panelBottom.flex = $scope.ui.panelBottom.expandedFlex;
          $scope.ui.panelTop.open = true;
          $scope.ui.panelBottom.open = true;
        }
      },
      panelBottom: {
        flex: 100,
        open: true,
        collapse: function() {
          if ($scope.ui.panelTop.open && $scope.ui.panelBottom.open) {
            $scope.ui.panelTop.expandedFlex = $scope.ui.panelTop.flex;
            $scope.ui.panelBottom.expandedFlex = $scope.ui.panelBottom.flex;
          }
          $scope.ui.panelTop.flex = 95;
          $scope.ui.panelBottom.flex = 5;
          $scope.ui.panelTop.open = true;
          $scope.ui.panelBottom.open = false;
        },
        expand: function() {
          $scope.ui.panelTop.flex = $scope.ui.panelTop.expandedFlex;
          $scope.ui.panelBottom.flex = $scope.ui.panelBottom.expandedFlex;
          $scope.ui.panelTop.open = true;
          $scope.ui.panelBottom.open = true;
        }
      },
      mapView: {
        left: 280,
        bottom: 0
      }
    };
    $scope.activeTool = {index:  1, deactivate: angular.noop};
    $scope.tools = [
      // {
      //   title: 'Zoom to max extent',
      //   icon: 'zoom-max',
      //   action: function() {
      //     var map = projectProvider.map;
      //     var pan = ol.animation.pan({
      //       duration: 300,
      //       source: map.getView().getCenter()
      //     });
      //     var zoom = ol.animation.zoom({
      //       duration: 300,
      //       resolution: map.getView().getResolution()
      //     });
      //     map.beforeRender(pan, zoom);
      //     map.getView().fit(projectProvider.config.project_extent, map.getSize());
      //   }
      // }, 
      {
        name: 'identification',
        title: 'Identification',
        tooltip: 'Identify features by mouse click',
        icon: 'circle-i',
        index: 0,
        rowsPerPage: 5,
        limit: 10,
        template: 'templates/tools/identification.html',
        markerIcon: 'plus',
        activate: function() {
          var tool = this;
          console.log('identification: activated');
          tool.collapsed = true;
          var sheetPromise = $mdBottomSheet.show({
            templateUrl: 'templates/tools/identification_table.html',
            clickOutsideToClose: false,
            disableParentScroll: false,
            parent: '.bottom-bar',
            controller: 'IdentificationController',
            locals: {tool: tool}
          });
          sheetPromise.then(function() {
            console.log('dentification: closed');
            tool.activated = false;
          });
          sheetPromise.catch(function() {
            console.log('dentification: closed by drag')
            tool.activated = false;
          });
        },
        deactivate: function() {
          $mdBottomSheet.hide();
        }
      }, {
        title: 'Measure',
        index: 1,
        tooltip: 'Mesure ...',
        icon: 'ruler',
        disabled: true,
        template: 'templates/tools/measure.html',
        activate: angular.noop,
        deactivate: angular.noop
      }, {
        name: 'print',
        index: 2,
        title: 'Print',
        tooltip: 'Print output creation',
        icon: 'printer',
        disabled: true,
        activate: angular.noop,
        deactivate: angular.noop
      }
    ];
    $scope.tools.get = function(name) {
      for (var i = 0; i < this.length; i++) {
        if (this[i].name === name) {
          return this[i];
        }
      }
    };

    $scope.activateTool = function(tool) {
      if ($scope.activeTool) {
        $scope.activeTool.deactivate();
      }
      $scope.activeTool = tool;
      $scope.activeTool.activate();
      $scope.ui.panelTop.flex = 'auto';
      //$scope.ui.toolPanelOpen = true;
      $timeout(function() {
        $scope.ui.toolPanelOpen = true;
      }, 650);
    };

    $scope.deactivateTool = function() {
      console.log('deactivateTool');
      if ($scope.activeTool) {
        $scope.activeTool.deactivate();
        $scope.activeTool = null;
        $scope.ui.panelTop.flex = 'auto';
      }
      $scope.ui.toolPanelOpen = false;
    };

    $scope.initializeApp = function() {
      webgis.project.then(function(projectData) {
        $scope.title = webgis.project.root_title;
        console.log(projectData);
        projectProvider.load(projectData);
        if (projectProvider.map) {
          projectProvider.map.setTarget('map');
          projectProvider.map.updateSize();
          var size = projectProvider.map.getSize();
          projectProvider.map.getView().fit(projectData.zoom_extent, size);
          projectProvider.map.addControl(new ol.control.ScaleLine());
          $scope.project = projectProvider;
          $scope.activateTool($scope.tools.get('identification'));
        }
      });
    };
  };
})();
