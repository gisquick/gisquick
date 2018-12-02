(function() {
  'use strict';

  angular
    .module('gl.web')
    .controller('SessionController', SessionController)
    .controller('LoginController', LoginController);

  /**
   * Shared data between SessionController and LoginController
   */
  var PROJECT_ERROR = {
    401: 'Authentication Required',
    403: 'Permissions Denied'
  };
  var confirmed = false;
  var heldProjectData;
  var heldProjectUser;
  var projectInfo = {};

  /**
   * Manages user session with the application - triggers initialization
   * of the application or login window. It also allows to close current
   * session and start a new one.
   */
  function SessionController($scope, $q, $mdDialog, projectProvider, gislabClient) {
    var projectPath = goog.uri.utils.getParamValue(location.search, "PROJECT");
    var projectStorageKey = 'gislab.project.path={0}'.format(projectPath);

    $scope.sessionInitialized = false;

    function showLoginScreen() {
      $scope.sessionInitialized = false;

      $mdDialog.show({
        templateUrl: 'templates/login.html',
        parent: angular.element(document.body),
        clickOutsideToClose: false,
        hasBackdrop: false,
        escapeToClose: false,
        controller: 'LoginController',
        fullscreen: true
      });
    }

    $scope.newSession = function() {
      var closeClinentSession = (gislabClient.userInfo.is_guest === false)?
        gislabClient.logout() : $q.when();

      closeClinentSession.then(function() {
        localStorage.removeItem(projectStorageKey);
        projectProvider.setProjectData(null);
        showLoginScreen();
      });
    };

    /**
     * Check project data response and decides whether run main application
     * with this project or show login screen.
     *
     * @param {object} project Project data
     */
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
        $scope.sessionInitialized = true;
      }
      if (project.status > 400 || !activeProject || !activeProject.loginWindowConfirmed) {
        // stop 'projectDataAvailable' event and temporary store
        // project's data for later - can be used for continue
        // from login window (by certain conditions)
        heldProjectData = project;
        heldProjectUser = gislabClient.userInfo;
        projectProvider.data = null;
        projectInfo.error = PROJECT_ERROR[project.status];
        showLoginScreen();
        return true; // true for stopping event dispatching
      }
      $scope.user = gislabClient.userInfo;
      heldProjectData = null;
      heldProjectUser = null;
    }

    projectProvider.on('projectDataAvailable', validateProject);
    if (projectProvider.data) {
      validateProject(projectProvider.data);
    }
  }

  /**
   * Controller for login dialog window
   */
  function LoginController($scope, $mdDialog, projectProvider, gislabClient, staticResources) {
    $scope.staticResources = staticResources;
    var projectPath = goog.uri.utils.getParamValue(location.search, "PROJECT");

    $scope.projectInfo = projectInfo;
    $scope.continueMode = gislabClient.userInfo.is_guest === false;
    $scope.resetPasswordUrl = window.app && window.app.reset_password_url;
    $scope.form = {
      username: $scope.continueMode? gislabClient.userInfo.username : '',
      password: $scope.continueMode? '********' : ''
    };

    function loadProject() {
      return gislabClient.project(projectPath)
        .then(
          function(projectData) {
            $mdDialog.hide();
            projectProvider.setProjectData(projectData);
          },
          function(err) {
            projectInfo.error = PROJECT_ERROR[err.status_code];
          }
        );
    }

    $scope.loginOrContinue = function() {
      confirmed = true;
      $scope.error = '';
      if ($scope.continueMode) {
        if (heldProjectData && heldProjectUser.username === gislabClient.userInfo.username) {
          $mdDialog.hide();
          projectProvider.setProjectData(heldProjectData);

        } else {
          loadProject();
        }
      } else {
        gislabClient.login($scope.form.username, $scope.form.password)
          .then(function(userData) {
            loadProject();
          }, function(err) {
            $scope.error = 'Authentication Failed';
          });
      }
    };

    if (projectInfo && projectInfo.authentication === 'all') {
      $scope.continueAsGuest = function() {
        $scope.error = '';
        confirmed = true;
        if (heldProjectData && heldProjectUser.is_guest && gislabClient.userInfo.is_guest) {
          $mdDialog.hide();
          projectProvider.setProjectData(heldProjectData);
        } else {
          gislabClient.login("guest")
            .then(function(userData) {
              loadProject();
            })
        }
      };
    }

    $scope.switchAccount = function() {
      $scope.continueMode = false;
      $scope.form.username = '';
      $scope.form.password = '';
    };
  }

})();
