(function() {
  'use strict';

  angular
    .module('gl.mobile')
    .controller('ProjectSettingsController', ProjectSettingsController);

  function ProjectSettingsController($scope, gislabMobileClient, projectProvider) {
    $scope.userProjects = [];

    $scope.fetchUserProjects = function() {
      gislabMobileClient.userProjects()
        .then(function(projects) {
          if (angular.isArray(projects)) {
            projects.forEach(function(projectData) {
              var publicationTime = new Date(projectData.publication_time_unix*1000)
              projectData.publish_date_text = publicationTime.toLocaleString();
              projectData.expiration_date_text = projectData.expiration_time_unix?
                new Date(projectData.expiration_time_unix*1000).toLocaleString() : '-';
            });
            $scope.userProjects = projects;
          }
        }, function(error) {
          ons.notification.alert({
            title: 'Warning',
            message: 'Failed to load list of user projects.'
          });
        });
    };
    $scope.fetchUserProjects();
  };
})();
