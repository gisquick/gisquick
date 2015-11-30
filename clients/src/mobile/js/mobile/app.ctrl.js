(function() {
  'use strict';

  angular
    .module('gl.mobile')
    .controller('MobileAppController', MobileAppController);

  function MobileAppController($scope, $timeout, $q, $localStorage, gislabMobileClient, projectProvider, layersControl, locationService) {
    $scope.$storage = $localStorage;
    $scope.currentProject = null;
    $scope.currentServer = null;
    $scope.ui = {
      tools_layers_tab: 0,
      tools_project_info_tab: 0,
    };
    $scope.ui.toolbar = [
      {
        icon: 'icon-layers',
        page: 'templates/tools/layers.html',
        persistent: true,
        disabled: true
      }, {
        icon: 'icon-project',
        page: 'templates/tools/project_info.html',
        persistent: true,
        disabled: true
      }, {
        icon: 'icon-zoom-max',
        toggle: false,
        disabled: true,
        callback: function() {
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
          projectProvider.map.getView().fit(projectProvider.config.project_extent, projectProvider.map.getSize());
        }
      }, {
        icon: 'icon-location',
        disabled: true,
        //toggle: true,
        toggle: false,
        callback: function() {
          if (this.icon === 'icon-location-target') {
            this.activated = false;
            this.icon = 'icon-location';
            locationService.deactivate(projectProvider.map);
          } else {
            if (!this.activated) {
              this.activated = true;
              locationService.setAutoPan(false);
              locationService.activate(projectProvider.map);
            } else {
              this.icon = 'icon-location-target';
              locationService.setAutoPan(true);
            }
          }
        }
      }, {
        icon: 'icon-settings',
        page: 'templates/settings/settings.html',
        disabled: false
      }
    ];

    $scope.toolTaped = function(tool) {
      //console.log(tool);
      if (tool.page) {
        if (!tool.activated) {
          var switchTool = false;
          $scope.ui.toolbar.forEach(function(item) {
            if (item.page && item.activated) {
              item.activated = false;
              switchTool = true;
            }
          });
          var animation = $scope.app.menu.isMenuOpened()? 'slide' : 'none';
          if (tool.activate) {
            tool.activate();
          }
          $scope.app.panel.tabbar.setActiveTab(tool._tab_index, {animation: animation});
          if (!switchTool) {
            $timeout(function() {
              $scope.app.menu.openMenu({autoCloseDisabled: true});
            });
          }
        } else {
          $scope.app.menu.closeMenu();
        }
        //$scope.app.menu.toggleMenu();
        tool.activated = !tool.activated;
      } else if (!tool.toggle) {
        if (tool.callback) {
          tool.callback();
        }
      } else {
        tool.activated = !tool.activated;
      }
    };

    $scope.loadProject = function(projectName, viewConfig) {
      var task = $q.defer();
      console.log('loadProject '+projectName);
      $scope.$storage.project = projectName;

      if ($scope.$storage.serverUrl) {
        gislabMobileClient.project(projectName)
          .then(function(data) {
            projectProvider.load(data);
            $scope.currentProject = projectName;
            if (projectProvider.map) {
              console.log('--- map ---');
              $scope.ui.toolbar[0].disabled = false;
              $scope.ui.toolbar[1].disabled = !angular.isDefined(projectProvider.map.getLayer('qgislayer'));
              $scope.ui.toolbar[2].disabled = false;
              $scope.ui.toolbar[3].disabled = false;
              var scaleLineControl = new ol.control.ScaleLine();
              projectProvider.map.addControl(scaleLineControl);
              // set visibility of map controls by user settings
              if (!$scope.$storage.showScaleLine) {
                scaleLineControl.setMap(null);
              }
              if (!$scope.$storage.showZoomControls) {
                var zoomControl = projectProvider.map.getControlByClass(ol.control.Zoom);
                zoomControl.setMap(null);
                var rotateControl = projectProvider.map.getControlByClass(ol.control.Rotate);
                rotateControl.element.classList.add('top');
              }
              //$scope.$storage.recentProjects = [];
              var currentProjectData = {
                project: data.project,
                title: data.root_title,
                author: data.author,
                publish_date_text: data.publish_date,
                expiration_date: data.expiration_date
              };
              if (!$scope.$storage.recentProjects) {
                $scope.$storage.recentProjects = [currentProjectData];
              } else {
                var index = -1;
                $scope.$storage.recentProjects.some(function(projectData, i) {
                  if (projectData.project === currentProjectData.project) {
                    index = i;
                    return true;
                  }
                });
                if (index !== -1) {
                  $scope.$storage.recentProjects.splice(index, 1);
                }
                $scope.$storage.recentProjects.splice(0, 0, currentProjectData);
              }
              $scope.project = data;
              // initialize map page
              $timeout(function() {
                //$scope.app.navigator.resetToPage('map_container.html');
                $scope.app.menu.closeMenu();
                $scope.app.menu.setMenuPage('panel_tab_container.html');
                $scope.app.menu.setMainPage('map.html');
                $timeout(function() {
                  projectProvider.map.setTarget('map');
                  if (viewConfig) {
                    projectProvider.map.getView().setCenter(viewConfig.center);
                    projectProvider.map.getView().setZoom(viewConfig.zoom);
                    projectProvider.map.getView().setRotation(viewConfig.rotation);
                    if (viewConfig.baseLayer) {
                      layersControl.setBaseLayer(projectProvider.map, viewConfig.baseLayer);
                      projectProvider.baseLayers.list.forEach(function(baseLayerModel) {
                        baseLayerModel.visible = viewConfig.baseLayer === baseLayerModel.name;
                      });
                    }
                    if (viewConfig.visibleLayers) {
                      layersControl.setVisibleLayers(projectProvider.map, viewConfig.visibleLayers);
                      projectProvider.layers.list.forEach(function(layerModel) {
                        layerModel.visible = viewConfig.visibleLayers.indexOf(layerModel.name) !== -1;
                      });
                    }
                  } else {
                    projectProvider.map.getView().fit(data.zoom_extent, projectProvider.map.getSize());
                  }
                  task.resolve();
                });
              });
            } else {
              task.reject();
            }
          }, function(error) {
            task.reject(error);
          })
      } else {
        console.log('No MAP');
        if (projectProvider.map) {
          projectProvider.map.dispose();
          projectProvider.map = null;
          $scope.ui.toolbar[0].disabled = true;
          $scope.ui.toolbar[1].disabled = true;
          $scope.ui.toolbar[2].disabled = true;
          $scope.ui.toolbar[3].disabled = true;
          $scope.app.menu.closeMenu();
          $scope.app.menu.setMenuPage('panel_tab_container.html');
          $scope.app.menu.setMainPage('map.html');
        }
        task.resolve();
      }
      return task.promise;
    };

    $scope.showProgressDialog = function(dialog, msg) {
      if (angular.isDefined(msg)) {
        $scope.setProgressBarMessage(msg);
      }
      dialog._showTime = Date.now();
      dialog.show();
    };
    $scope.hideProgressDialog = function(dialog, minShowTime, done) {
      var args = Array.prototype.slice.call(arguments, 4);
      var thiz = arguments[3] || null;
      var elapsed = Date.now() - dialog._showTime;
      dialog._showTime = 0;
      if (elapsed >= minShowTime) {
        dialog.hide();
        if (angular.isFunction(done)) {
          done.apply(thiz, args);
        }
      } else {
        $timeout(function() {
          dialog.hide();
          if (angular.isFunction(done)) {
            done.apply(thiz, args);
          }
        }, minShowTime-elapsed);
      }
    };
    $scope.setProgressBarMessage = function(msg) {
      $scope.progressBarMessage = msg;
    };

    $scope.abortRequest = function() {
      gislabMobileClient.abortRequest();
    };

    $scope.loginProgressBarTask = function() {
      $scope.setProgressBarMessage('Login to GIS.lab server');
      return gislabMobileClient.login($scope.$storage.serverUrl, $scope.$storage.username, $scope.$storage.password)
        .then(function() {
          $scope.currentServer = '{0}:{1}:{2}'.format($scope.$storage.serverUrl, $scope.$storage.username, $scope.$storage.password);
        }, function(error) {
          $scope.currentServer = null;
          if (error.canceled) {
            $scope.hideProgressDialog($scope.app.progressBar, 0);
          } else {
            var msg;
            if (error.invalid_server)
              msg = "Can't connect to server";
            else if (error.status_code === 401)
              msg = "Authentication failed";
            else
              msg = "Network error";
            $scope.hideProgressDialog($scope.app.progressBar, 800, function() {
              ons.notification.alert({
                title: 'Error',
                message: msg
              });
            });
          }
          return $q.reject(error);
        });
    };
    $scope.loadProjectProgressBarTask = function(viewConfig) {
      $scope.setProgressBarMessage('Loading project');
      return $scope.loadProject($scope.$storage.project, viewConfig)
        .catch(function(error) {
          if (error.canceled) {
            $scope.hideProgressDialog($scope.app.progressBar, 0);
          } else {
            var msg;
            if (error.invalid_server)
              msg = "Can't connect to server";
            else if (error.status_code === 401)
              msg = "Authentication required";
            else if (error.status_code === 403)
              msg = "Permission denied";
            else if (error.status_code === 404)
              msg = "Project doesn't exist";
            else
              msg = "Failed to load project";
            $scope.hideProgressDialog($scope.app.progressBar, 800, function() {
              ons.notification.alert({
                title: 'Error',
                message: msg
              });
            });
          }
        })
    };

    $scope.loginAndLoadProjectInProgressBar = function(viewConfig) {
      console.log('loginAndLoadProjectInProgressBar');
      //$scope.$storage.serverUrl = '';
      if ($scope.$storage.serverUrl) {
        $scope.loadWizard = false;
        $scope.showProgressDialog($scope.app.progressBar);
        $scope.loginProgressBarTask()
          .then(function() {
            $scope.loadProjectProgressBarTask(viewConfig)
              .then(function() {
                $scope.hideProgressDialog($scope.app.progressBar, 800);
              })
          });
      } else {
        console.log('startup config needed');
        $scope.loadProject(null);
        if (!angular.isDefined($scope.loadWizard)) {
          $scope.loadWizard = true;
        }
      }
    };

    $scope.loadProjectInProgressBar = function() {
      $scope.showProgressDialog($scope.app.progressBar);
      $scope.loadProjectProgressBarTask()
        .then(function() {
          $scope.hideProgressDialog($scope.app.progressBar, 800);
        });
    };

    $scope.saveMapState = function() {
      var map = projectProvider.map;
      if (map) {
        var baseLayer = layersControl.getVisibleBaseLayer(map);
        $scope.$apply(function() {
          $scope.$storage.mapState = {
            project: $scope.$storage.project,
            center: map.getView().getCenter(),
            zoom: map.getView().getZoom(),
            rotation: map.getView().getRotation(),
            visibleLayers: layersControl.getVisibleLayers(map),
            baseLayer: baseLayer? baseLayer.get('name') : ''
          };
        });
      }
    };

    $scope.updateScreenSize = function() {
      $timeout(function() {
        //$scope.screenWidth = innerWidth;
        //$scope.screenHeight = innerHeight;
        $scope.screenWidth = document.body.clientWidth;
        $scope.screenHeight = document.body.clientHeight;
        if (projectProvider.map) {
          $timeout(function() {
            projectProvider.map.updateSize();
          }, 10);
        }
      }, 150);
    };
    ons.ready(function() {
      console.log('ons ready');
      if (!angular.isDefined($scope.$storage.showScaleLine)) {
        $scope.$storage.showScaleLine = true;
        $scope.$storage.showHeader = true;
        $scope.$storage.showZoomControls = true;
      }
      setImmediate(function() {
        $scope.app.menu._mainPageGestureDetector.enable(false);
        $scope.app.menu.on('postclose', function() {
          $scope.ui.toolbar.forEach(function(tool) {
            if (tool.page && tool.activated) {
              $timeout(function() {
                tool.activated = false;
              });
            }
          });
        });
      });
      $scope.app.navigator.on('postpop', function(evt) {
        if (evt.leavePage.page === 'templates/settings/project.html' && $scope.currentProject !== $scope.$storage.project) {
          $scope.loadProjectInProgressBar();
        }
        if (evt.leavePage.page === 'templates/settings/server.html') {
          var server = '{0}:{1}:{2}'.format($scope.$storage.serverUrl, $scope.$storage.username, $scope.$storage.password);
          if ($scope.currentServer !== server) {
            if ($scope.currentServer) {
              gislabMobileClient.logout()
                .finally(function() {
                  $scope.loginAndLoadProjectInProgressBar();
                });
            } else {
              $scope.loginAndLoadProjectInProgressBar();
            }
          }
        }
        if (evt.enterPage.page === 'map_container.html' && projectProvider.map && projectProvider.map.getSize()[0] === 0) {
          projectProvider.map.updateSize();
        }
      });
      // wait for initialization of modal components (progress bar, startup wizard)
      setImmediate(function() {
        $scope.updateScreenSize();
        if ($scope.$storage.mapState && $scope.$storage.mapState.project === $scope.$storage.project) {
          $scope.loginAndLoadProjectInProgressBar($scope.$storage.mapState);
        } else {
          $scope.loginAndLoadProjectInProgressBar();
        }
      });
    });

    // device APIs are available
    function onDeviceReady() {
      setTimeout(function() {
        navigator.splashscreen.hide();
      }, 100);
      ons.setDefaultDeviceBackButtonListener(function() {
        if (!$scope.exitDialogShown) {
          $scope.exitDialogShown = true;
          ons.notification.confirm({
            message: 'Are you sure to close the app?',
            callback: function(index) {
              if (index === 1) { // OK button
                $scope.saveMapState();
                navigator.app.exitApp(); // Close the app
              }
              $scope.exitDialogShown = false;
            }
          });
        }
      });

      window.addEventListener('orientationchange', function() {
        $scope.updateScreenSize();
      });
      document.addEventListener("pause", onPause, false);
      document.addEventListener("resume", function() {
        /*
        console.log("--------RESUMED--------");
        */
      }, false);

    };
    function onPause() {
      console.log("--------PAUSE--------");
      $scope.saveMapState();
    }
    console.log('register deviceready');
    document.addEventListener("deviceready", onDeviceReady, false);
  };
})();
