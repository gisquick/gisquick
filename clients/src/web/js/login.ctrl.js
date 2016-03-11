(function() {
  'use strict';

  angular
    .module('gl.web')
    .controller('AppLoader', AppLoader)
    .factory('projectLoader', [projectLoader]);

  function projectLoader(gislabClient) {

    function ProjectLoader() {
      this.eventListeners = {
        projectLoaded: [],
        projectClosed: []
      };
    }

    ProjectLoader.prototype._fireEvent = function(event, data) {
      var listenerCallback = function(listener) {
        if (listener._oneTimeListener) {
          var index = this.eventListeners[event].indexOf(listener);
          this.eventListeners[event].splice(index, 1);
        }
        return listener(data);
      }.bind(this);
      var listeners = this.eventListeners[event].concat([]);
      listeners.find(listenerCallback);
    };

    ProjectLoader.prototype.setProjectData = function(data) {
      if (data !== null) {
        this.projectData = data;
        this._fireEvent('projectLoaded', data);
      } else {
        var data = this.projectData
        this.projectData = null;
        this._fireEvent('projectClosed', data);
      }
    };

    ProjectLoader.prototype.on = function(event, listener) {
      this.eventListeners[event].push(listener);
      listener._oneTimeListener = false;
    };

    ProjectLoader.prototype.un = function(event, listener) {
      var index = this.eventListeners[event].indexOf(listener);
      if (index !== -1) {
        this.eventListeners[event].splice(index, 1);
      }
    };

    ProjectLoader.prototype.once = function(event, listener) {
      this.eventListeners[event].push(listener);
      listener._oneTimeListener = true;
    };

    return new ProjectLoader();
  }

  function AppLoader($scope, $timeout, $q, $mdDialog, projectProvider, gislabClient, staticResources, projectLoader) {
    $scope.staticResources = staticResources;
    var projectPath = goog.uri.utils.getParamValue(location.search, "PROJECT");
    var projectStorageKey = 'gislab.project.path={0}'.format(projectPath);
    var projectError = {
      401: 'Authentication Required',
      403: 'Permissions Denied'
    };

    var confirmed = false;
    var heldProjectData;
    var heldProjectUser;
    var projectInfo = {};

    /**
    * Reinitialize whole application/project (by temporary reset
    * of 'appInitialized' variable binded to ng-if directive)
    * and launch login window
    */
    $scope.appInitialized = true;

    function closeProject() {
      localStorage.removeItem(projectStorageKey);
      projectLoader.setProjectData(null);
      $scope.appInitialized = false;
      $timeout(function() {
        $scope.appInitialized = true;
      }, 50);
      showLoginScreen();
    }
    
    $scope.newSession = function() {
      if (gislabClient.userInfo.is_guest === false) {
        gislabClient.logout()
          .then(closeProject);
      } else {
        closeProject();
      }
    };

    function validateProject(project) {
      var activeProjectChanged = false;

      if (project.status === 200) {
        projectInfo = {
          title: project.root_title,
          authentication: project.authentication,
          author: project.author
        }

        var activeProject = JSON.parse(localStorage.getItem(projectStorageKey));
        if (activeProject) {
          if (
              activeProject.project !== projectPath ||
              activeProject.username !== gislabClient.userInfo.username ||
              (!activeProject.loginWindowConfirmed && confirmed)
            ) {
            activeProjectChanged = true;
          }
        }
        if (!activeProject || activeProjectChanged) {
          activeProject = {
            project: projectPath,
            username: gislabClient.userInfo.username,
            loginWindowConfirmed: confirmed
          };
          localStorage.setItem(
            projectStorageKey,
            JSON.stringify(activeProject)
          );
        }
      }
      if (project.status > 400 || !activeProject || !activeProject.loginWindowConfirmed) {
        // stop 'projectLoaded' event and temporary store
        // project's data for later - can be used for continue
        // from login window (by certain conditions)
        heldProjectData = project;
        heldProjectUser = gislabClient.userInfo;
        projectLoader.projectData = null;
        projectInfo.error = projectError[project.status];
        showLoginScreen();
        return true;
      }
      $scope.user = gislabClient.userInfo;
      heldProjectData = null;
      heldProjectUser = null;
    }

    function showLoginScreen() {
      var scope = $scope.$new();

      function loadProject() {
        return gislabClient.project(projectPath)
          .then(
            function(projectData) {
              $mdDialog.hide();
              projectLoader.setProjectData(projectData);
            },
            function(err) {
              projectInfo.error = projectError[err.status_code];
            }
          );
      }

      scope.projectInfo = projectInfo;
      scope.continueMode = gislabClient.userInfo.is_guest === false;
      scope.form = {
        username: scope.continueMode? gislabClient.userInfo.username : '',
        password: scope.continueMode? '********' : ''
      };

      scope.switchAccount = function() {
        scope.continueMode = false;
        scope.form.username = '';
        scope.form.password = '';
      };

      scope.loginOrContinue = function() {
        confirmed = true;
        scope.error = '';
        if (scope.continueMode) {
          if (heldProjectData && heldProjectUser.username === gislabClient.userInfo.username) {
            $mdDialog.hide();
            projectLoader.setProjectData(heldProjectData);

          } else {
            loadProject();
          }
        } else {
          gislabClient.login(scope.form.username, scope.form.password)
            .then(function(userData) {
              loadProject();
            }, function(err) {
              scope.error = 'Authentication Failed';
            });
        }
      };

      if (projectInfo && projectInfo.authentication === 'all') {
        scope.continueAsGuest = function() {
          scope.error = '';
          confirmed = true;
          if (heldProjectData && heldProjectUser.is_guest && gislabClient.userInfo.is_guest) {
            $mdDialog.hide();
            projectLoader.setProjectData(heldProjectData);
          } else {
            gislabClient.login("guest")
              .then(function(userData) {
                loadProject();
              })
          }
        };
      }

      $mdDialog.show({
        templateUrl: 'templates/login.html',
        parent: angular.element(document.body),
        clickOutsideToClose: false,
        hasBackdrop: false,
        escapeToClose: false,
        scope: scope,
        fullscreen: true
      });
    }

    projectLoader.on('projectLoaded', validateProject);
    if (projectLoader.projectData) {
      validateProject(projectLoader.projectData);
    }
  }

})();
