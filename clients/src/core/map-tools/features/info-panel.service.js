(function() {
  'use strict';

  angular
    .module('gl.features')
    .factory('infoPanel', infoPanel)
    .directive('glInfoPanel', glInfoPanel)

    // Support for loading of AngularJS components after application has been bootstrapped
    .config(function($controllerProvider, $provide, $compileProvider) {
      angular.module('gl.features').controller = function(name, constructor) {
        $controllerProvider.register(name, constructor);
        return(this);
      };
    })

    function glInfoPanel() {
      return {
        templateUrl: 'templates/info_panel.html',
        transclude: true
      }
    }

  function infoPanel(projectProvider, $timeout, $q, $mdPanel) {

    var panelPosition = {
      top: 8,
      right: 8
    };
    function InfoPanel() {
      this.activePanel = null;
    }

    InfoPanel.prototype.close = function() {
      if (this.activePanel) {
        this.activePanel.panel.close();
        this.activePanel.panel.destroy();
        this.activePanel = null;
      }
    }

    InfoPanel.prototype.isOpen = function() {
      return this.activePanel !== null;
    }

    InfoPanel.prototype.showEmpty = function($scope) {
      if (this.isOpen()) {
        this.activePanel.scope.feature = null;
        this.activePanel.scope.layer = null;
      }
    }

    InfoPanel.prototype.show = function(feature, layer, $scope) {
      var _this = this;

      if (!layer.info_template) return;

      if (this.activePanel && this.activePanel.layer === layer) {
        this.activePanel.scope.feature = feature;
        this.activePanel.scope.data = feature.getProperties();
        if (this.activePanel.isHidden) {
          this.activePanel.panel.show();
          this.activePanel.isHidden = false;
        }
        this.activePanel.scope.$broadcast('featurechange', feature);
        return;
      }

      this.close();

      var scope = $scope.$new(true);
      scope.layer = layer;
      scope.feature = feature;
      scope.data = feature.getProperties();
      scope.Math = Math;

      var template = angular.element('<div>'+layer.info_template+'</div>');

      var dependenciesLoaded = $q.when();

      // fetch list of already loaded JS scripts
      var currentScripts = Array.from(
          document.querySelectorAll('script[src]')
        ).map(function(elem) {
          return elem.src;
        });

      // JavaScript Dependencies (filter only not loaded yet)
      var scriptElems = Array.from(
          template[0].querySelectorAll('script[src]')
        ).filter(function(elem) {
          return currentScripts.indexOf(elem.src) === -1;
        });

      if (scriptElems.length) {
        var loading = $q.defer();
        dependenciesLoaded = loading.promise;
        var loaded = 0;
        scriptElems.forEach(function(scriptElem) {
          var script = document.createElement('script');
          script.type = 'text/javascript';
          script.src = scriptElem.src;
          script.onload = function() {
            console.log('loaded: '+script.src)
            if (++loaded === scriptElems.length) {
              loading.resolve();
            }
          }
          document.body.appendChild(script);
        });
      }

      var scriptEl = template[0].querySelector('script:not([src])');
      var controller;
      if (scriptEl) {
        // generate layer hash for unique layer's controller name
        var layerId = layer.name.split('').reduce(
          function(a,b){a=((a<<5)-a)+b.charCodeAt(0);return a&a},0
        ) + 2147483647 + 1; // make it a positive integer
        controller = "LayerCtrl_"+layerId
        if (!document.querySelector('script[layer="{0}"]'.format(layer.name))) {
          // Add script with controller of layer's Info Panel template
          var scriptCode = '(function() {{ angular.module("gl.features").controller("{0}", {1}) }})()'
            .format(controller, scriptEl.text);

          scriptEl = document.createElement('script');
          scriptEl.setAttribute('layer', layer.name);
          scriptEl.type = 'text/javascript';
          scriptEl.innerHTML = scriptCode;
          document.body.appendChild(scriptEl);
        }
      }

      var styleEl = template.find('style')[0];
      var style = '';
      if (styleEl) {
        style = styleEl.outerHTML;
      }

      var html = template.find('template').html();
      if (controller) {
        html = '<div ng-controller="{0} as ctrl">{1}</div>'.format(controller, html)
      }

      var panel = $mdPanel.create({
        attachTo: angular.element(document.body),
        template: '<div gl-info-panel md-whiteframe="16" rc-drag=".panel-header">'+style+html+'</div>',
        propagateContainerEvents: true,
        scope: scope,
        controller: ['$scope', 'mdPanelRef', function($scope, mdPanelRef) {
          $scope.closePanel = function() {
            mdPanelRef.hide();
            _this.activePanel.isHidden = true;
          }
        }],
        onDomAdded: function(args) {
          var panel = args[1].panelContainer.children();
          panel.css({top: 0, right: 0});
          panel.css('transform', 'translate('+(-panelPosition.right)+'px, '+ panelPosition.top +'px)');
        },
        onRemoving: function(panel) {
          var bounds = panel.panelContainer[0].firstElementChild.getBoundingClientRect();
          panelPosition.top = bounds.top;
          panelPosition.right = window.innerWidth - bounds.right;
        }
      });

      this.activePanel = {
        layer: layer,
        panel: panel,
        scope: scope
      };
      dependenciesLoaded.then(panel.open.bind(panel));
    }

    return new InfoPanel();
  };
})();
