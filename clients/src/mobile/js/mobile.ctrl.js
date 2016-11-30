(function() {
  'use strict';

  angular
    .module('gl.mobile')
    .controller('MobileController', MobileController)
    .controller('SettingsController', SettingsController)
    .controller('ServerSettingsController', ServerSettingsController)
    .controller('ProjectSettingsController', ProjectSettingsController)
    .controller('WizardController', WizardController)
    .directive('glNavigator', glNavigator)
    .directive('glNavigatorPage', glNavigatorPage)
    .value('keyHandler', {
      backHandlers: [],
      menuHandlers: []
    });


  function glNavigatorPage() {
    return {
      restrict: 'E',
      templateUrl: 'templates/navigator_page.html',
      transclude: true
    };
  }

  function glNavigator($mdCompiler, $timeout, $animate, keyHandler) {
    return {
      restrict: 'E',
      scope: false,
      controller: function($scope, $element) {
        var stack = [];
        $scope.navigator = {
          pushPage: function(options) {
            if (options.autoWrap !== false) {
              options.transformTemplate = function(template) {
                return '<gl-navigator-page>'+template+'</gl-navigator-page>';
              };
            }

            $mdCompiler.compile(options).then(function(compileData) {
              //attach controller & scope to element
              var parentScope = stack.length? stack[stack.length-1].scope : $scope;
              var scope = parentScope.$new(false);
              scope.title = options.title;
              var elem = compileData.link(scope);

              stack.push({
                scope: scope,
                preserveScope: options.preserveScope,
                elem: elem
              });
              elem.addClass('navigator-page');
              $element.append(elem);
              $timeout(function() {
                $animate.addClass(elem, 'enter');
              }, 20, false);
            });
          },
          back: function() {
            var page = stack.pop();
            if (page) {
              $animate.removeClass(page.elem, 'enter', function() {
                if (page.preserveScope !== true) {
                  page.scope.$destroy();
                }
                page.elem.remove();
              });
            } else {
              keyHandler.backHandlers.pop();
              $scope.close();
            }
          }
        }
        $scope._backButtonHandler = function(evt) {
          $scope.navigator.back();
        }
        keyHandler.backHandlers.push($scope._backButtonHandler);
      }
    };
  }


  function updateRecentProjectsList(projectData) {
    console.log(projectData);
    console.log($localStorage);

    var projectHistoryRecord = {
      title: projectData.root_title,
      project: projectData.project
    };

    if (!$localStorage.recentProjects) {
      $localStorage.recentProjects = [projectHistoryRecord];
    } else {
      $localStorage.recentProjects = $localStorage.recentProjects.filter(function(item) {
        return item.project !== projectData.project;
      });
      $localStorage.recentProjects.splice(0, 0, projectHistoryRecord);
    }
  }

  /**
   * Main controller of GIS.lab Web application. It is responsible for initialization of map
   * and map-related components.
   */
  function MobileController($scope, $timeout, $q, $localStorage, $mdPanel, $mdToast,
    gislabClient, projectProvider, toolsManager, keyHandler) {
    console.log('MobileController');

    // $localStorage.serverUrl = '';

    function startApplication() {
      console.log('## startApplication ##');
      toolsManager.addTool({
        name: 'settings',
        ui: {
          icon: 'menu-dots'
        },
        config: {},
        initialize: function() {},
        activate: function() {
          $scope.openSettings();
        },
        deactivate: function() {}
      });

      projectProvider.once('mapInitialized', function(map) {
        toolsManager.setScaleLineVisibility($localStorage.showScaleLine);
        toolsManager.setAttributionsVisibility($localStorage.showAttributions);
        toolsManager.setZoomControlsVisibility($localStorage.showZoomControls);
        $timeout(function() {
          var tool = toolsManager.tools.splice(0, 1)[0];
          toolsManager.addTool(tool);
        });
      });

      var initTask;

      if ($localStorage.serverUrl) {
        gislabClient.setServer($localStorage.serverUrl);
        // gislabClient.login('guest', '')
        initTask = $q.defer()
        var login = ($localStorage.username)? gislabClient.login($localStorage.username, $localStorage.password) : $q.when();
        login.then(function() {
          gislabClient.project($localStorage.project)
            .then(function(projectData) {
              updateRecentProjectsList(projectData);
              projectProvider.setProjectData(projectData);
              $scope.sessionInitialized = true;
              initTask.resolve();
            }, initTask.reject);
          }, initTask.reject);
      }

      if (!initTask) {
        console.log('App is not configured');
        $mdPanel.open({
          templateUrl: 'templates/startup_wizard.html',
          controller: 'WizardController',
          fullscreen: true,
          locals: {
            wizardClosed: function(projectData) {
              console.log('WIZARD CLOSED');
              updateRecentProjectsList(projectData);
              projectProvider.setProjectData(projectData);
              $scope.sessionInitialized = true;
            }
          }
        });
      } else {
        initTask.promise.catch(function(error) {
          console.log(error);
          $scope.openSettings();
        });
      }
    }

    $scope.openSettings = function() {
      var animation = $mdPanel.newPanelAnimation()
        .withAnimation($mdPanel.animation.FADE);

      $mdPanel.open({
        templateUrl: 'templates/settings.html',
        controller: 'SettingsController',
        animation: animation,
        fullscreen: true
      });
    };


    startApplication();

    projectProvider.on('projectClosed', function() {
      console.log('projectClosed');

      $scope.sessionInitialized = false;
      // toolsManager.tools = [];

      $timeout(function() {
        $scope.sessionInitialized = true;
        startApplication();
      }, 10);
    });

    function backButtonHandler() {
      if (toolsManager.activeTool) {
        toolsManager.deactivateTool();
      } else {
        navigator.app.exitApp();
      }
    }
    keyHandler.backHandlers.push(backButtonHandler);

    document.addEventListener("deviceready", onDeviceReady, false);
    function onDeviceReady() {
      console.log('onDeviceReady');
      document.addEventListener("backbutton", function(evt) {
        keyHandler.backHandlers[keyHandler.backHandlers.length-1].call(null, evt);
      });
      // document.addEventListener("menubutton", function() {
      //   console.log('MENU PRESSED');
      // }, false);
    }

    window.$localStorage = $localStorage;
    window.projectProvider = projectProvider;
  }


  function SettingsController($scope, $timeout, $localStorage, toolsManager, projectProvider, mdPanelRef) {
    $scope.$settings = $localStorage;

    function sessionConfigSnapshot() {
      return {
        project: $localStorage.project,
        username: $localStorage.username,
        password: $localStorage.password
      };
    }

    var settingsBefore = sessionConfigSnapshot();
    settingsBefore = JSON.stringify(sessionConfigSnapshot());

    $scope.close = function() {
      mdPanelRef.close();
      toolsManager.activeTool = null;
      console.log('settings closed');
      if (JSON.stringify(sessionConfigSnapshot()) === settingsBefore) {
        console.log('same settings');
        return;
      }
      projectProvider.setProjectData(null);
    };

    $scope.project = projectProvider.data;
    $scope.scaleLineVisibilityChanged = toolsManager.setScaleLineVisibility;
    $scope.attributionsVisibilityChanged = toolsManager.setAttributionsVisibility;
    $scope.zoomControlsVisibilityChanged = toolsManager.setZoomControlsVisibility;
  }

  function ServerSettingsController($scope, $mdDialog, $localStorage) {
    console.log('ServerSettingsController');
    $scope.saveProfile = function(serverUrl, username, password) {
      var confirm = $mdDialog.prompt()
        .title('Save')
        .textContent("Enter profile name")
        .placeholder('Name')
        .ariaLabel('Name')
        .theme(' ')
        .ok('Save')
        .cancel('Cancel');

      $mdDialog.show(confirm).then(function(profileName) {
        console.log(profileName);
        if (!angular.isDefined($localStorage.serverProfiles)) {
          $localStorage.serverProfiles = [];
        }
        if ($localStorage.serverProfiles.indexOf(profileName) === -1) {
          $localStorage.serverProfiles.push({
            name: profileName,
            serverUrl: serverUrl,
            username: username,
            password: password
          });
        }
      });
    };

    $scope.removeProfile = function(profile) {
      var profileIndex = $localStorage.serverProfiles.indexOf(profile);
      $localStorage.serverProfiles.splice(profileIndex, 1);
    };

    $scope.loadProfile = function(profile) {
      $localStorage.serverUrl = profile.serverUrl;
      $localStorage.username = profile.username;
      $localStorage.password = profile.password;
    }
  }


  function ProjectSettingsController($scope, $timeout, gislabClient) {
    $scope.loading = true;
    $scope.userProjects = [];
    var timestamp = performance.now();
    var loadedProjects;
    gislabClient.userProjects()
      .then(function(data) {
        loadedProjects = data.projects;
      })
      .finally(function() {
        var elapsedTime = performance.now() - timestamp;
        $timeout(function() {
          $scope.loading = false;
          $scope.userProjects = loadedProjects;
        }, Math.max(1000-elapsedTime, 0));
      });
  }

  function WizardController($scope, $timeout, $localStorage, $mdDialog, mdPanelRef, gislabClient, projectProvider, wizardClosed) {
    $scope.pageIndex = 0;
    $scope.$settings = $localStorage;

    // $localStorage.serverUrl = 'https://localhost:8000';
    // $localStorage.username = 'vagrant';
    // $localStorage.password = 'vagrant';

    $scope.back = function() {
      $scope.pageIndex--;
    };

    function showProgress(title) {
      $mdDialog.show({
        fullscreen: true,
        escapeToClose: false,
        template: '<md-dialog class="progress-dialog" layout="column">'+
            '<span flex="30"></span>'+
            '<h4 class="title">'+title+'</h4>'+
            '<md-progress-linear md-mode="indeterminate"></md-progress-linear>'+
            '<span flex></span>'+
          '</md-dialog>'
      });
    }

    $scope.login = function(serverUrl, username, password) {
      gislabClient.setServer(serverUrl);

      showProgress('Login in');
      gislabClient.login(username, password)
        .then(function() {
          gislabClient.userProjects()
            .then(function(data) {
              $scope.userProjects = data.projects;
              $timeout(function() {
                $mdDialog.hide(); // close progress dialog
                $scope.pageIndex++;
              }, 1000);
            });
        }, function() {
          $mdDialog.show(
            $mdDialog.alert()
              .clickOutsideToClose(true)
              .title('Failed to login')
              .textContent('Please enter valid configuration or try it later')
              .ariaLabel('Alert Dialog Demo')
              .theme(' ')
              .ok('Ok')
          );
        });
    };

    $scope.finish = function() {
      showProgress('Loading project');
      gislabClient.project($localStorage.project)
        .then(function(projectData) {
            mdPanelRef.close().then(function() {
              $mdDialog.hide(); // close progress dialog
              wizardClosed(projectData);
            });
          }, function() {
            $mdDialog.show(
              $mdDialog.alert()
                .clickOutsideToClose(true)
                .title('Failed to load project')
                .textContent('Please enter valid project or leave it blank')
                .ariaLabel('Alert Dialog Demo')
                .theme(' ')
                .ok('Ok')
            );
          });
    };
  }

})();
