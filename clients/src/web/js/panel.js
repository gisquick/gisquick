(function() {
  'use strict';

  angular
    .module('gl.web')
    .factory('glPanelManager', glPanelManager);


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


  function glPanelManager($mdBottomSheet, $animateCss, $q, $$interimElement, $timeout, $animate) {

    function PanelManager() {
      this.mapView = {
        left: 0,
        top: 0,
        bottom: 0,
        right: 0,
        width: window.innerWidth,
        height: window.innerHeight
      }
      this.eventListeners = {
        mapViewResized: []
      }
    }

    PanelManager.prototype.initialize = function(options) {
      this.panelElement = this._ngElement(options.mainPanel);
      this.statusBar = {
        element: this._ngElement(options.statusBar),
        _hidden: false,  // controlled by hideStatusBar/showStatusBar
        disabled: false, // controlled by window size (width)
        visible: true    // visibility (read-only)
      };
      this.mapView.bottom = this.statusBar.element[0].clientHeight;
      var panel = this;
      window.addEventListener("resize", function(evt) {
        $timeout(function() {
          panel._windowResized();
          panel.updateLayout();
          panel._fireResizeEvent();
        }, 200); // Chrome needs some time to update window size
      });
      panel._windowResized();
      panel.updateLayout();
    }

    PanelManager.prototype.on = function(event, listener) {
      this.eventListeners[event].push(listener);
    };

    PanelManager.prototype.un = function(event, listener) {
      var index = this.eventListeners[event].indexOf(listener);
      if (index !== -1) {
        this.eventListeners[event].splice(index, 1);
      }
    };

    PanelManager.prototype._fireResizeEvent = function(event, listener) {
      this.eventListeners['mapViewResized'].forEach(function(listener) {
        listener(this.mapView);
      }, this);
    };

    PanelManager.prototype._ngElement = function(element) {
      var id = element.replace('#', '');
      return angular.element(document.getElementById(id));
    };

    PanelManager.prototype.toggleMainPanel = function() {
      this.mapView.left = this.mapView.left === 0? 280 : 0;
      this._fireResizeEvent();
    };

    PanelManager.prototype._calculateBottom = function() {
        if (this.bottomPanel) {
          this.mapView.bottom = this.bottomPanel.element.clientHeight-80;
        } else {
          if (this.statusBar.visible) {
            this.mapView.bottom = this.statusBar.element[0].clientHeight;
          } else {
            this.mapView.bottom = 0;
          }
        }
    };

    PanelManager.prototype.hideStatusBar = function() {
      this.statusBar._hidden = true;
      this.statusBar.element.css('transform', 'translate(0, 100%)');
      this.statusBar.visible = false;
      this._calculateBottom();
    };

    PanelManager.prototype.showStatusBar = function() {
      this.statusBar._hidden = false;
      if (!this.statusBar.disabled) {
        this.statusBar.element.css('transform', 'translate(0, 0)');
        this.statusBar.visible = true;
        this._calculateBottom();
      }
    };

    PanelManager.prototype._windowResized = function() {
      this.statusBar.disabled = window.innerWidth < 900;
      if (this.statusBar.visible && this.statusBar.disabled) {
        this.statusBar.element.css('transform', 'translate(0, 100%)');
        this.statusBar.visible = false;
        this._calculateBottom();
      }
      if (!this.statusBar.visible && !this.statusBar.disabled && !this.statusBar._hidden) {
        this.statusBar.element.css('transform', 'translate(0, 0)');
        this.statusBar.visible = true;
        this._calculateBottom();
      }
      this.mapView.width = window.innerWidth;
      this.mapView.height = window.innerHeight;
    };

    PanelManager.prototype.updateLayout = function() {
      if (!this.contentPanel) {
        return;
      }
      var hasSecondaryPanel = (this.secondaryPanel && this.secondaryPanel.element)? true : false;
      this.contentPanel.collapseEnabled = hasSecondaryPanel;
      var toolFormHeight = 0;
      if (this.toolsPanel) {
        toolFormHeight = this.toolsPanel.element[0].clientHeight;
      }

      var containerHeight = this.panelElement[0].clientHeight;
      this.accordionMode = containerHeight < 500;
      if (this.accordionMode && hasSecondaryPanel && !this.contentPanel.collapsed && !this.secondaryPanel.collapsed) {
        this.contentPanel.collapsed = true;
      }

      //TODO: get headers heights correctly
      var contentPanelHeaderHeight = 30;
      var secondaryPanelHeaderHeight = 30;
      var contentPanelHeight = 0;
      var secondaryPanelHeight = 0;

      if (!this.contentPanel.collapsed && !hasSecondaryPanel) {
        contentPanelHeight = containerHeight - contentPanelHeaderHeight;
      }
      if (!this.contentPanel.collapsed && hasSecondaryPanel && !this.secondaryPanel.collapsed) {
        contentPanelHeight = (containerHeight - contentPanelHeaderHeight - secondaryPanelHeaderHeight)/2;
        secondaryPanelHeight = contentPanelHeight;
      } else if (!this.contentPanel.collapsed && hasSecondaryPanel && this.secondaryPanel.collapsed) {
        contentPanelHeight = (containerHeight - contentPanelHeaderHeight - secondaryPanelHeaderHeight);
      } else if (this.contentPanel.collapsed && hasSecondaryPanel && !this.secondaryPanel.collapsed) {
        secondaryPanelHeight = (containerHeight - contentPanelHeaderHeight - secondaryPanelHeaderHeight);
      }
      this.contentPanel.element.parent().css('flex', '0 0 {0}%'.format(100*contentPanelHeight/containerHeight));
      if (hasSecondaryPanel) {
        this.secondaryPanel.element.parent().css('flex', '0 0 {0}%'.format(100*secondaryPanelHeight/containerHeight));
        //this.secondaryPanel.element.parent().css('height', '{0}px'.format(secondaryPanelHeight));
        //this.secondaryPanel.top = this.secondaryPanel.element[0].offsetTop;
        this.secondaryPanel.height = secondaryPanelHeight;
      }
    };

    PanelManager.prototype.loadToolsPanel = function(options) {
      var toolsPanel = $$interimElement();
      var panel = this;
      options.onShow = function(scope, element, options) {
        toolsPanel.element = element;
        return $animate.enter(element, options.parent);
      }
      this.toolsPanel = toolsPanel;
      this.toolsPanel.collapsed = false;
      return toolsPanel.show(options);
    };

    // PanelManager.prototype.loadToolsPanel = function(options) {
    //   $mdCompiler.compile(options)
    //     .then(function(compileData) {
    //       // attach controller and scope to element
    //       compileData.link(options.scope);
    //       var parent = angular.element(document.getElementById(options.parent.replace('#', '')));
    //       parent.append(compileData.element);
    //       this.toolsPanel = compileData;
    //       this.toolsPanel.collapsed = false;
    //     }.bind(this));
    // }

    PanelManager.prototype.showToolsPanel = function() {
      console.log('showToolsPanel');
      if (this.toolsPanel.collapsed) {
        this.toolsPanel.collapsed = false;
        expandElement($animateCss, this.toolsPanel.element);
        this.updateLayout();
      }
    };
    PanelManager.prototype.hideToolsPanel = function() {
      if (!this.toolsPanel.collapsed) {
        this.toolsPanel.collapsed = true;
        collapseElement($animateCss, this.toolsPanel.element);
        this.updateLayout();
      }
    };

    PanelManager.prototype.showContentPanel = function(options) {
      var panel = this;
      var contentPanel = $$interimElement();
      contentPanel.collapsed = false;
      options.onShow = function(scope, element, options) {
        contentPanel.element = element;
        $timeout(function() {
          panel.updateLayout();
        }, 100);
        return $animate.enter(element, options.parent);
      }
      this.contentPanel = contentPanel;
      return contentPanel.show(options);
    };

    PanelManager.prototype._openPanel = function(options) {
      // options.scope = options.scope;
      var _this = this;

      var layout = options.layout;
      this.verticalMode = window.innerHeight > window.innerWidth || window.innerWidth < 600;
      // this.verticalMode = true;

      if (this.verticalMode) {
        angular.extend(options, layout.vertical);
        this.secondaryPanel = $$interimElement();
        this.secondaryPanel.collapsed = false;
        if (this.accordionMode && !this.contentPanel.collapsed) {
          this.contentPanel.collapsed = true;
        }
        angular.extend(options, {
          onShow: function(scope, element, options) {
            //console.log(element.find('md-tabs')[0].scrollHeight);
            options.parent.removeClass('hidden');
            this.secondaryPanel.element = element;
            var promise = $animate.enter(element, options.parent);
            this.updateLayout();
            return promise;
          }.bind(this),
          onRemove: function(scope, element, options) {

            console.log('onRemove');
            element.parent().css('flex', '0 0 0');
            options.parent.addClass('hidden');
            this.secondaryPanel.headerElement.addClass("hidden");
            this.secondaryPanel = null;
            if (this.contentPanel.collapsed) {
              this.contentPanel.collapsed = false;
            }
            this.updateLayout();
            return element && $animate.leave(element) || $q.when();
          }.bind(this)
        });
        if (options.header) {
          this.secondaryPanel.headerElement = this._ngElement(options.header);
          this.secondaryPanel.headerElement.removeClass("hidden");
        }
        return this.secondaryPanel.show(options);
      } else {
        angular.extend(options, layout.horizontal);
        
        angular.extend(options, {
          clickOutsideToClose: false,
          disableParentScroll: false
        });

        $timeout(function() {
          _this.bottomPanel = {
            element: document.querySelector(".bottom-bar md-bottom-sheet")
          };
          _this.panelResized();
        }, 800);

        var promise = $mdBottomSheet.show(options);
        promise.finally(function() {
          _this.bottomPanel = null;
          _this.panelResized();
        });
        return promise;
      }
    };

    PanelManager.prototype.panelResized = function() {
      var _this = this;
      $timeout(function() {
        console.log('panelResized');
        _this._calculateBottom();
      }, 10);

    };

    PanelManager.prototype.showPanel = function(options) {
      console.log('showPanel');
      if (this.secondaryPanel) {
        return this.secondaryPanel.hide().then(function() {
          //console.log('-- hide complete --');
          return this._openPanel(options);
        }.bind(this));
      } else {
        return this._openPanel(options);
      }
    };

    PanelManager.prototype.hidePanel = function(options) {
      if (this.verticalMode) {
        if (this.secondaryPanel) {
          this.secondaryPanel.collapsed = true;
          this.updateLayout();
          setTimeout(function() {
            this.secondaryPanel.hide();
          }.bind(this), 500);
          if (this.secondaryPanel.headerElement) {
            this.secondaryPanel.headerElement.addClass("hidden");
          }
        }
      } else {
        $mdBottomSheet.hide();
      }
    };

    PanelManager.prototype.togglePanel = function(options) {
      // console.log('togglePanel');
      var panelElement = this.secondaryPanel.element;
      this.secondaryPanel.collapsed = !this.secondaryPanel.collapsed;
      if (this.secondaryPanel.collapsed && this.contentPanel.collapsed) {
        this.contentPanel.collapsed = false;
      }
      if (!this.secondaryPanel.collapsed && this.accordionMode && !this.contentPanel.collapsed) {
        this.contentPanel.collapsed = true;
      }
      this.updateLayout();
    };

    PanelManager.prototype.toggleContentPanel = function(options) {
      // console.log('toggleContentPanel');
      this.contentPanel.collapsed = !this.contentPanel.collapsed;
      if (this.contentPanel.collapsed && this.secondaryPanel && this.secondaryPanel.collapsed) {
        this.secondaryPanel.collapsed = false;
      }
      if (!this.contentPanel.collapsed && this.accordionMode && this.secondaryPanel && !this.secondaryPanel.collapsed) {
        this.secondaryPanel.collapsed = true;
      }
      this.updateLayout();
    };

    return new PanelManager();
  };
})();
