(function() {
  'use strict';

  angular
    .module('gl.userpage')
    .factory('userPageLoader', userPageLoader)
    .controller('LoginController', LoginController)
    .controller('UserPageController', UserPageController);


  function userPageLoader(Observable, $mdDialog, gislabClient) {

    function UserPageLoader() {
      Observable.call(this, ["dataLoaded"]);
      this.data = null;
    }

    UserPageLoader.prototype = Object.create(Observable.prototype);

    UserPageLoader.prototype.setData = function(data) {
      this.data = data;
      this.dispatchEvent("dataLoaded", data);
    };

    UserPageLoader.prototype.showLoginScreen = function() {
      console.log('showLoginScreen');
      if (gislabClient.userInfo && gislabClient.userInfo.is_guest === false) {
        gislabClient.logout();
      }
      $mdDialog.show({
        templateUrl: 'templates/login.html',
        parent: angular.element(document.body),
        clickOutsideToClose: false,
        hasBackdrop: false,
        escapeToClose: false,
        controller: 'LoginController',
        fullscreen: true
      });
    };

    UserPageLoader.prototype.logout = function() {
      console.log('logout');
      gislabClient.logout().then(this.showLoginScreen.bind(this));
    };

    return new UserPageLoader();
  }

  function LoginController($scope, staticResources, userPageLoader, gislabClient, $mdDialog) {
    $scope.staticResources = staticResources;

    $scope.login = function(username, password) {
      console.log('login');
      gislabClient.login(username, password)
        .then(function() {
          gislabClient.userProjects()
            .then(function(appData) {
              appData['user'] = gislabClient.userInfo;
              userPageLoader.setData(appData);
              $mdDialog.hide();

            });
        }, function(err) {
          $scope.error = 'Authentication Failed';
        });
    };
  }

  function UserPageController($scope, staticResources, userPageLoader) {
    console.log('UserPageController');
    $scope.staticResources = staticResources;
    $scope.initialized = false;

    var applicationData;
    function initialize(appData) {
      if (appData.status >= 400 &&  appData.status < 500) {
        userPageLoader.showLoginScreen();
      } else {
        applicationData = appData;
        var projects = appData.projects;
        $scope.projects = projects;
        $scope.projects.rowsPerPage = 25;

        $scope.user = appData.user;
        $scope.initialized = true;
      }
    }

    if (userPageLoader.data) {
      initialize(userPageLoader.data);
    }
    userPageLoader.on("dataLoaded", initialize);

    $scope.openHelp = function() {
      setTimeout(function() { // run it outside Angular's digest cycle
        var width = parseInt(window.innerWidth * 0.65);
        var height = parseInt(window.innerWidth * 0.85);
        var left = parseInt((window.innerWidth - width) / 2);
        var windowParams =
          "left={0},width={1},height={2},resizable=yes,menubar=no,scrollbars=yes,status=no"
          .format(left, width, height);
        window.open(
          applicationData.gislab_documentation,
          "Gisquick Documentation",
          windowParams
        );
      });
    };

    $scope.logout = function() {
      $scope.initialized = false;
      userPageLoader.logout();
    };
  }

 })();
