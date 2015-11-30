(function() {
  'use strict';

  angular
    .module('gl.mobile')
    .controller('ServerSettingsController', ServerSettingsController);

  function ServerSettingsController($scope) {
    $scope.saveServerProfile = function(serverUrl, username, password) {
      ons.notification.prompt({
        title: 'Save',
        message: 'Enter profile name.',
        cancelable: true,
        buttonLabels: ['Cancel', 'OK'],
        primaryButtonIndex: 1,
        callback: function(name) {
          console.log(name);
          if (!angular.isDefined($scope.$storage.serverProfiles)) {
            $scope.$storage.serverProfiles = [];
          }
          $scope.$storage.serverProfiles.push({
            name: name,
            serverUrl: serverUrl,
            username: username,
            password: password
          });
        }
      });
    };
    $scope.removeProfile = function(profile) {
      var profileIndex = $scope.$storage.serverProfiles.indexOf(profile);
      $scope.$storage.serverProfiles.splice(profileIndex, 1);
    };
    $scope.loadProfile = function(profile) {
      $scope.$storage.serverUrl = profile.serverUrl;
      $scope.$storage.username = profile.username;
      $scope.$storage.password = profile.password;
    }
  };
})();
