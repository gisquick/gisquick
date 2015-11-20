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
    var bottomSheetPromise = $q.when('');
    $scope.tools = [
      {
        title: 'Zoom to max extent',
        icon: 'zoom-max',
        action: function() {
          var map = projectProvider.map;
          var pan = ol.animation.pan({
            duration: 300,
            source: map.getView().getCenter()
          });
          var zoom = ol.animation.zoom({
            duration: 300,
            resolution: map.getView().getResolution()
          });
          map.beforeRender(pan, zoom);
          map.getView().fit(projectProvider.config.project_extent, map.getSize());
        }
      }, {
        name: 'print',
        title: 'Print output creation',
        icon: 'printer',
        toggleGroup: '1',
        disabled: true
      }, {
        title: 'Draw points, lines, polygons',
        icon: 'pen',
        toggleGroup: '2',
        disabled: true
      }, {
        name: 'search',
        title: 'Search features by attributes',
        icon: 'binocular',
        toggleGroup: '1',
        rowsPerPage: 5,
        limit: 50,
        template: 'templates/toolbar/search.html',
        showTable: function() {
          var tool = this;
          bottomSheetPromise.finally(function() {
            bottomSheetPromise = $mdBottomSheet.show({
              templateUrl: 'templates/search_table.html',
              disableParentScroll: false,
              hasBackdrop: false,
              parent: '.bottom-bar',
              controller: 'SearchController',
              locals: {tool: tool}
            });
            bottomSheetPromise.catch(function() {
              bottomSheetPromise = $q.when('');
              tool.activated = false;
            });
          });
        },
        activate: function() {
          if (this.layerIndex) {
            this.showTable();
          }
        },
        deactivate: function() {
          $mdBottomSheet.hide();
        }
      }, {
        name: 'identification',
        title: 'Identify features by mouse click',
        icon: 'circle-i',
        toggleGroup: '1',
        rowsPerPage: 5,
        limit: 10,
        template: 'templates/toolbar/identification.html',
        markerIcon: 'plus',
        activate: function() {
          var tool = this;
          bottomSheetPromise.finally(function() {
            bottomSheetPromise = $mdBottomSheet.show({
              templateUrl: 'templates/identification_table.html',
              clickOutsideToClose: false,
              disableParentScroll: false,
              parent: '.bottom-bar',
              controller: 'IdentificationController',
              locals: {tool: tool}
            });
            bottomSheetPromise.catch(function() {
              bottomSheetPromise = $q.when('');
              tool.activated = false;
            });
          });
        },
        deactivate: function() {
          $mdBottomSheet.hide();
        }
      }
    ];
    $scope.tools.get = function(name) {
      for (var i = 0; i < this.length; i++) {
        if (this[i].name === name) {
          return this[i];
        }
      };
    }
    $scope.toggleTool = function(tool) {
      if (angular.isFunction(tool.action)) {
        tool.action();
      }
      if (tool.toggleGroup) {
        if (!tool.activated) {
          $scope.tools.forEach(function(t) {
            if (t.activated && tool !== t && t.toggleGroup === tool.toggleGroup) {
              t.activated = false;
              t.deactivate();
            }
          });
        }
        tool.activated = !tool.activated;
        if (tool.activated) {
          tool.activate();
        } else {
          tool.deactivate();
        }
      }
    };
    webgis.project.then(function(projectData) {
      $scope.title = webgis.project.root_title;
      console.log(projectData);
      projectProvider.load(projectData);
      var mapElem = angular.element(document.getElementById('map'));
      mapElem.css('height', mapElem.parent()[0].scrollHeight+'px');
      if (projectProvider.map) {
        projectProvider.map.setTarget('map');
        projectProvider.map.getView().fit(projectData.zoom_extent, projectProvider.map.getSize());
        projectProvider.map.addControl(new ol.control.ScaleLine());
        $scope.project = projectProvider;
        //mapElem.css('height', '100%');
        $scope.toggleTool($scope.tools.get('identification'));
      }
    });
  };
})();
