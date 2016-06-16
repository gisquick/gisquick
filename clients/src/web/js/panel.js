(function() {
  'use strict';

  angular
    .module('gl.web')
    .factory('glPanelManager', glPanelManager);

  /**
   * Service for handling opening/closing application's panels and status bar.
   * It abstracts used UI framework (low level functions) and provide API for
   * handling application layout, which is:

   ---------------------------------------------------
   |   ACTIVE    |                                   |
   |    TOOL     |                                   |
   |             |                                   |
   +-------------+                                   |
   |             |                                   |
   |  left-top   |                                   |
   |             |                MAP                |
   |             |                                   |
   +-------------+                                   |
   |             |                                   |
   |   CONTENT   |                                   |
   |             |                                   |
   |             |-----------------------------------|
   +-------------+                                   |
   |             |                                   |
   | left-bottom |              bottom               |
   |             |                              -----|
   |             |                                   | <- status bar
   ---------------------------------------------------

  * The layout consist of:
  *  - collapsible left panel, where are by default displayed ACTIVE TOOL
  *    panel (if activated) and CONTENT panel (layers, legend)
  *  - MAP container
  *  - status bar - can be coverd by optional bottom panel
  *
  * Panel manager allows to open one additional optional panel - left-top,
  * left-bottom or bottom.
  */

  function glPanelManager($mdBottomSheet, $q, $$interimElement, $timeout, $animate, Observable, glAccordionUtils) {

    function PanelManager() {
      Observable.call(this, ["mapViewResized"]);
      // hold actual position/size info about map panel
      this.mapView = {
        left: 0,
        top: 0,
        bottom: 0,
        right: 0,
        width: window.innerWidth,
        height: window.innerHeight
      };
    }

    PanelManager.prototype = Object.create(Observable.prototype);

    function ngElement(selector) {
      return angular.element(document.querySelector(selector));
    };

    PanelManager.prototype.initialize = function(options) {
      this.panelElement = ngElement(options.mainPanel);
      this._initializeContentPanel(options.contentPanel);

      var toolsPanelElem = ngElement(options.toolsPanel);
      toolsPanelElem.css('maxHeight', '0');
      toolsPanelElem.addClass("no-animation");
      this.toolsPanel = {
        element: toolsPanelElem,
        collapsed: true
      };

      this.statusBar = {
        element: ngElement(options.statusBar),
        _hidden: false,  // controlled by hideStatusBar/showStatusBar
        disabled: false, // controlled by window size (width)
        visible: true    // visibility (read-only)
      };

      this.mapView.bottom = this.statusBar.element[0].clientHeight;
      var panel = this;
      window.addEventListener("resize", function(evt) {
        $timeout(function() {
          panel._windowResized();
          panel._updateLayout();
          panel.dispatchEvent("mapViewResized", panel.mapView);
        }, 200); // Chrome needs some time to update window size
      });
      panel._windowResized();
    }

    PanelManager.prototype._calculateBottom = function() {
      if (this.secondaryBottomPanel) {
        if (!this.secondaryBottomPanel.element) {
          this.secondaryBottomPanel.element = document.querySelector(".bottom-bar md-bottom-sheet");
        }
        if (this.secondaryBottomPanel.element) {
          var height = this.secondaryBottomPanel.element.clientHeight-80;
          if (height > 0) {
            this.mapView.bottom = height;
            return;
          }
        }
      }

      if (this.statusBar.visible) {
        this.mapView.bottom = this.statusBar.element[0].clientHeight;
      } else {
        this.mapView.bottom = 0;
      }
    };

    /**
     * Hides status bar
     */
    PanelManager.prototype.hideStatusBar = function() {
      this.statusBar._hidden = true;
      this.statusBar.element.css('transform', 'translate(0, 100%)');
      this.statusBar.visible = false;
      this._calculateBottom();
    };

    /**
     * Shows status bar
     */
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

    PanelManager.prototype._updateLayout = function() {
      if (!this.contentPanel.element) {
        return;
      }
      var hasSecondaryPanel = (this.secondaryLeftPanel && this.secondaryLeftPanel.element)? true : false;
      this.contentPanel.collapseEnabled = hasSecondaryPanel;
      var toolFormHeight = 0;
      if (this.toolsPanel) {
        toolFormHeight = this.toolsPanel.element[0].clientHeight;
      }

      var containerHeight = this.panelElement[0].clientHeight;
      this.accordionMode = containerHeight < 500;
      if (this.accordionMode && hasSecondaryPanel && !this.contentPanel.collapsed && !this.secondaryLeftPanel.collapsed) {
        this.contentPanel.collapsed = true;
      }

      //TODO: get headers heights correctly
      var contentPanelHeaderHeight = 30;
      var secondaryLeftPanelHeaderHeight = 30;
      var contentPanelHeight = 0;
      var secondaryLeftPanelHeight = 0;

      if (!this.contentPanel.collapsed && !hasSecondaryPanel) {
        contentPanelHeight = containerHeight - contentPanelHeaderHeight;
      }
      if (!this.contentPanel.collapsed && hasSecondaryPanel && !this.secondaryLeftPanel.collapsed) {
        contentPanelHeight = (containerHeight - contentPanelHeaderHeight - secondaryLeftPanelHeaderHeight)/2;
        secondaryLeftPanelHeight = contentPanelHeight;
      } else if (!this.contentPanel.collapsed && hasSecondaryPanel && this.secondaryLeftPanel.collapsed) {
        contentPanelHeight = (containerHeight - contentPanelHeaderHeight - secondaryLeftPanelHeaderHeight);
      } else if (this.contentPanel.collapsed && hasSecondaryPanel && !this.secondaryLeftPanel.collapsed) {
        secondaryLeftPanelHeight = (containerHeight - contentPanelHeaderHeight - secondaryLeftPanelHeaderHeight);
      }
      this.contentPanel.element.parent().css('flex', '0 0 {0}%'.format(100*contentPanelHeight/containerHeight));
      if (hasSecondaryPanel) {
        this.secondaryLeftPanel.element.parent().css('flex', '0 0 {0}%'.format(100*secondaryLeftPanelHeight/containerHeight));
        //this.secondaryLeftPanel.element.parent().css('height', '{0}px'.format(secondaryLeftPanelHeight));
        //this.secondaryLeftPanel.top = this.secondaryLeftPanel.element[0].offsetTop;
        this.secondaryLeftPanel.height = secondaryLeftPanelHeight;
      }
    };

    /**
     * Opens active tool panel
     */
    PanelManager.prototype.showToolsPanel = function() {
      var _this = this;
      if (_this.toolsPanel.collapsed) {
        $timeout(function() {
          _this.toolsPanel.collapsed = false;
          glAccordionUtils.expandElement(
            _this.toolsPanel.element,
            0.45,
            // turn on panel animations after tool activation
            function() {
              _this.toolsPanel.element.removeClass("no-animation");
            }
          );
          _this._updateLayout();
        }, 20);
      }
    };

    /**
     * Hides active tool panel
     */
    PanelManager.prototype.hideToolsPanel = function() {
      if (!this.toolsPanel.collapsed) {
        this.toolsPanel.collapsed = true;
        glAccordionUtils.collapseElement(
          this.toolsPanel.element,
          0.45,
          // turn off panel animation when panel is closed for
          // quick tool (UI tab) switch for later tool activation
          function() {
            this.toolsPanel.element.addClass("no-animation");
          }.bind(this)
        );
        this._updateLayout();
      }
    };

    PanelManager.prototype._initializeContentPanel = function(options) {
      var panel = this;
      var contentPanel = $$interimElement();
      contentPanel.collapsed = false;
      options.onShow = function(scope, element, options) {
        contentPanel.element = element;
        $timeout(function() {
          panel._updateLayout();
        }, 100);
        return $animate.enter(element, options.parent);
      }
      this.contentPanel = contentPanel;
      return contentPanel.show(options);
    };

    PanelManager.prototype._openPanel = function(options) {
      var _this = this;
      var panelLocation;
      if (options.left && options.bottom) {
        panelLocation = (window.innerHeight > window.innerWidth || window.innerWidth < 600)?
          'left' : 'bottom';
      } else {
        panelLocation = options.left? 'left' : 'bottom';
      }

      // panelLocation = 'left';
      if (panelLocation === 'left') {
        options = angular.extend({
          templateUrl: options[panelLocation].template,
          parent: options[panelLocation].position === 'top'?
            '#secondary-panel-top' : '#secondary-panel-bottom'

        }, options);
        this.secondaryLeftPanel = $$interimElement();
        this.secondaryLeftPanel.collapsed = false;
        this.secondaryLeftPanel.location = panelLocation;
        if (this.accordionMode && !this.contentPanel.collapsed) {
          this.contentPanel.collapsed = true;
        }
        angular.extend(options, {
          onShow: function(scope, element, options) {
            if (options.header) {
              this.secondaryLeftPanel.headerElement = ngElement(options.header);
              this.secondaryLeftPanel.headerElement.removeClass("hidden");
            }

            options.parent.removeClass('hidden');
            this.secondaryLeftPanel.element = element;
            var promise = $animate.enter(element, options.parent);
            this._updateLayout();
            return promise;
          }.bind(this),
          onRemove: function(scope, element, options) {
            element.parent().css('flex', '0 0 0');
            options.parent.addClass('hidden');
            if (this.contentPanel.collapsed) {
              this.contentPanel.collapsed = false;
            }
            this._updateLayout();
            return element && $animate.leave(element) || $q.when();
          }.bind(this)
        });
        return this.secondaryLeftPanel.show(options);
      } else {
        options = angular.extend({
          parent: ".bottom-bar",
          templateUrl: options.bottom.template,
          clickOutsideToClose: false,
          disableParentScroll: false
        }, options);

        _this.secondaryBottomPanel = {
          element: null
        };
        $timeout(function() {
          _this.panelResized();
        }, 800);
        var promise = $mdBottomSheet.show(options);
        promise.finally(function() {
          _this.panelResized();
        });
        return promise;
      }
    };

    /**
     * Method to be called when secondary panel (bottom) has resized
     */
    PanelManager.prototype.panelResized = function() {
      var _this = this;
      $timeout(function() {
        _this._calculateBottom();
      }, 10);
    };

    /**
     * Opens secondary panel defined in 'options' argument
     */
    PanelManager.prototype.showSecondaryPanel = function(options) {
      if (this.secondaryLeftPanel) {
        return this.secondaryLeftPanel.hide().then(function() {
          return this._openPanel(options);
        }.bind(this));
      } else {
        return this._openPanel(options);
      }
    };

    /**
     * Switch current optional (secondary) panel with another panel.
     * It is preffered (more synchronized) than closing first panel
     * and opening a new one.
     */
    PanelManager.prototype.switchSecondaryPanel = function(options) {
      // TODO properly check left or bottom panels
      if (!this.secondaryLeftPanel && !this.secondaryBottomPanel) {
        return this._openPanel(options);
      }
      if (this.secondaryLeftPanel) {
        // collapse panel first (for animation)
        this.secondaryLeftPanel.collapsed = true;
        this._updateLayout();
        
        var hideComplete = $q.defer();
        var oldPanel = this.secondaryLeftPanel;
        // wait for collapse animation and then open new panel
        $timeout(function() {
          oldPanel.hide();
          hideComplete.resolve();
        }, 450);
        options.resolve = options.resolve || {};
        options.resolve.hideComplete = function() {
          return hideComplete.promise;
        };
        if (this.secondaryLeftPanel.headerElement) {
          this.secondaryLeftPanel.headerElement.addClass("hidden");
        }
        return this._openPanel(options);
      } else {
        return this._openPanel(options);
      }
    };

    /**
     * Hides current optional (secondary) panel.
     */
    PanelManager.prototype.hidePanel = function() {
      if (this.secondaryLeftPanel) {
        this.secondaryLeftPanel.collapsed = true;
        this._updateLayout();
        var oldPanel = this.secondaryLeftPanel;
        setTimeout(function() {
          oldPanel.hide();
        }.bind(this), 450);
        if (this.secondaryLeftPanel.headerElement) {
          this.secondaryLeftPanel.headerElement.addClass("hidden");
        }
        this.secondaryLeftPanel = null;
      } else if (this.secondaryBottomPanel) {
        this.secondaryBottomPanel = null;
        $mdBottomSheet.hide();
      }
    };

    /**
     * Toggles collapsed/expanded state of the whole left panel
     */
    PanelManager.prototype.toggleMainPanel = function() {
      this.mapView.left = this.mapView.left === 0? 280 : 0;
      this.dispatchEvent("mapViewResized", this.mapView);
    };

    /**
     * Toggles collapsed/expanded state of the left secondary (top or bottom) panel
     */
    PanelManager.prototype.toggleSecondaryLeftPanel = function() {
      // console.log('togglePanel');
      var panelElement = this.secondaryLeftPanel.element;
      this.secondaryLeftPanel.collapsed = !this.secondaryLeftPanel.collapsed;
      if (this.secondaryLeftPanel.collapsed && this.contentPanel.collapsed) {
        this.contentPanel.collapsed = false;
      }
      if (!this.secondaryLeftPanel.collapsed &&
          this.accordionMode &&
          !this.contentPanel.collapsed) {
        this.contentPanel.collapsed = true;
      }
      this._updateLayout();
    };

    /**
     * Toggles collapsed/expanded state of the content panel (only if some secondary
     * left panel is opened)
     */
    PanelManager.prototype.toggleContentPanel = function() {
      // console.log('toggleContentPanel');
      this.contentPanel.collapsed = !this.contentPanel.collapsed;
      if (this.contentPanel.collapsed &&
          this.secondaryLeftPanel &&
          this.secondaryLeftPanel.collapsed) {
        this.secondaryLeftPanel.collapsed = false;
      }
      if (!this.contentPanel.collapsed &&
          this.accordionMode &&
          this.secondaryLeftPanel &&
          !this.secondaryLeftPanel.collapsed) {
        this.secondaryLeftPanel.collapsed = true;
      }
      this._updateLayout();
    };

    return new PanelManager();
  };
})();
