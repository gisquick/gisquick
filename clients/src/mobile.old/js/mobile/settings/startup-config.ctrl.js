(function() {
  'use strict';

  angular
    .module('gl.mobile')
    .controller('StartupConfigController', StartupConfigController);

  function StartupConfigController($scope, $timeout, gislabMobileClient) {
    console.log('StartupConfigController');
    $scope.wizardLogin = function() {
      if (!$scope.$storage.serverUrl) {
        return;
      }
      if ($scope.$storage.username && $scope.$storage.password) {
        $scope.showProgressDialog($scope.app.progressBar);
        $scope.loginProgressBarTask()
          .then(function() {
            $scope.app.wizard.carousel.next();
            $scope.setProgressBarMessage('Loading list of user projects ...');
            gislabMobileClient.userProjects()
              .then(function(data) {
                if (angular.isArray(data)) {
                  data.forEach(function(projectData) {
                    var publicationTime = new Date(projectData.publication_time_unix*1000);
                    projectData.publish_date_text = publicationTime.toLocaleString();
                    projectData.expiration_date_text = projectData.expiration_time_unix?
                      new Date(projectData.expiration_time_unix*1000).toLocaleString() : '-';
                  });
                  $scope.userProjects = data;
                }
                $scope.hideProgressDialog(
                  $scope.app.progressBar,
                  800,
                  $scope.app.wizard.carousel.next,
                  $scope.app.wizard.carousel
                );
              }, function(error) {
                if (error.canceled) {
                  $scope.hideProgressDialog($scope.app.progressBar, 0);
                } else {
                  $scope.hideProgressDialog($scope.app.progressBar, 800, function() {
                    ons.notification.alert({
                      title: 'Warning',
                      message: 'Failed to load list of your projects.'
                    });
                  });
                }
              });
          });
      } else {
        $scope.app.wizard.carousel.next();
      }
    };
    var updateCarouselLayout = function() {
      $timeout(function() {
        var carousel = $scope.app.wizard.carousel;
        var carouselIndex = carousel.getActiveCarouselItemIndex();
        carousel._currentElementSize = null;
        carousel.refresh();
        carousel._scroll = carouselIndex * carousel._getCarouselItemSize();
        carousel._scrollTo(carousel._scroll);
      }, 150);
    };
    $scope.close = function() {
      window.removeEventListener('orientationchange', updateCarouselLayout);
      $scope.app.wizard.dialog.hide();
    };
    $scope.finish = function() {
      $scope.close();
      $scope.loadProjectInProgressBar();
    };

    //$scope.$storage.serverUrl = 'localhost:8000';
    $scope.$storage.serverUrl = 'web.gis.lab';

    setImmediate(function() {
      console.log($scope.app.wizard);
      $scope.app.wizard.dialog.show();
      
      $scope.app.wizard.carousel.setActiveCarouselItemIndex(0);
      // fix carousel view after change of screen orientation
      window.addEventListener('orientationchange', updateCarouselLayout);
      $scope.app.wizard.dialog.getDeviceBackButtonHandler().setListener(function() {
        if ($scope.app.wizard.carousel.getActiveCarouselItemIndex() > 0) {
          $scope.app.wizard.carousel.prev();
        } else {
          $scope.close();
        }
      });
    });
  };
})();
