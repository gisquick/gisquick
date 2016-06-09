(function() {
  'use strict';

  angular
  .module('gl.ui')
  .directive('glPaginator', glPaginator)
  .directive('glSinglePagePaginator', glSinglePagePaginator);


  function glPaginator() {
    return {
      restrict: 'E',
      scope: {
        paginator: '=ngModel',
        rowsPerPage: '=glRows',
        pageChanged: '&'
      },
      template: '\
        <md-button\
          md-no-ink\
          aria-label="First page"\
          class="pagination-button button-first icon-hover"\
          ng-disabled="paginator.page === 1"\
          ng-click="\
            paginator.page = 1;\
            pageChanged({$page: 1})\
          ">\
          <md-icon md-svg-icon="page-first"></md-icon>\
        </md-button>\
        <md-button\
          md-no-ink\
          aria-label="Previous page"\
          class="pagination-button button-prev icon-hover"\
          ng-disabled="paginator.page === 1"\
          ng-click="\
            paginator.page = paginator.page-1;\
            pageChanged({$page: paginator.page})\
          ">\
          <md-icon md-svg-icon="arrow-left"></md-icon>\
        </md-button>\
        <span class="pagination-label">\
          {{ (paginator.page-1)*rowsPerPage+1 }}\
           - {{ Math.min(paginator.length, paginator.page*rowsPerPage) }}\
          of {{ paginator.length }}\
        </span>\
        <md-button\
          md-no-ink\
          aria-label="Next page"\
          class="pagination-button button-next icon-hover"\
          ng-disabled="paginator.page >= lastPage"\
          ng-click="\
            paginator.page = paginator.page+1;\
            pageChanged({$page: paginator.page})\
          ">\
          <md-icon md-svg-icon="arrow-right"></md-icon>\
        </md-button>\
        <md-button\
          md-no-ink\
          aria-label="Last page"\
          class="pagination-button button-last icon-hover"\
          ng-disabled="paginator.page >= lastPage"\
          ng-click="\
            paginator.page = lastPage;\
            pageChanged({$page: lastPage})\
          ">\
          <md-icon md-svg-icon="page-last"></md-icon>\
        </md-button>\
      ',
      controller: function($scope) {
        $scope.lastPage = 1;
        function updatePagination() {
          $scope.lastPage = Math.ceil($scope.paginator.length/$scope.rowsPerPage);
          if ($scope.paginator.page > $scope.lastPage) {
            $scope.paginator.page = $scope.lastPage;
          }
        }
        $scope.Math = Math;
        $scope.$watch('paginator', function(value) {
          if (angular.isDefined(value) && !angular.isDefined(value.page)) {
            value.page = 1;
            updatePagination();
          }
        });
        $scope.$watch('rowsPerPage', function(value) {
          if (angular.isDefined($scope.paginator)) {
            updatePagination();
          }
        });
      },
      link: function(scope, iElem, iAttrs) {}
    };
  }


  function glSinglePagePaginator() {
    return {
      restrict: 'E',
      scope: {
        paginator: '=ngModel',
        pageChanged: '&'
      },
      template: '\
        <md-button\
          md-no-ink\
          aria-label="First page"\
          class="pagination-button button-first icon-hover"\
          ng-disabled="paginator.page === 1"\
          ng-click="\
            paginator.page = 1;\
            pageChanged({$page: 1})\
          ">\
          <md-icon md-svg-icon="page-first"></md-icon>\
        </md-button>\
        <md-button\
          md-no-ink\
          aria-label="Previous page"\
          class="pagination-button button-prev icon-hover"\
          ng-disabled="paginator.page === 1"\
          ng-click="\
            paginator.page = paginator.page-1;\
            pageChanged({$page: paginator.page})">\
          <md-icon md-svg-icon="arrow-left"></md-icon>\
        </md-button>\
        <span class="pagination-label">\
          {{ paginator.length? paginator.page : 0 }} of {{ paginator.length }}\
        </span>\
        <md-button\
          md-no-ink\
          aria-label="Next page"\
          class="pagination-button button-next icon-hover"\
          ng-disabled="paginator.page >= paginator.length"\
          ng-click="\
            paginator.page = paginator.page+1;\
            pageChanged({$page: paginator.page})\
          ">\
          <md-icon md-svg-icon="arrow-right"></md-icon>\
        </md-button>\
        <md-button\
          md-no-ink\
          aria-label="Last page"\
          class="pagination-button button-last icon-hover"\
          ng-disabled="paginator.page >= paginator.length"\
          ng-click="\
            paginator.page = paginator.length;\
            pageChanged({$page: paginator.page})\
          ">\
          <md-icon md-svg-icon="page-last"></md-icon>\
        </md-button>\
      ',
      controller: function($scope) {
        $scope.Math = Math;
        $scope.$watch('paginator', function(value) {
          if (angular.isDefined(value) && !angular.isDefined(value.page)) {
            value.page = 1;
            $scope.pageChanged({$page: 1});
          }
        });
      },
      link: function(scope, iElem, iAttrs) {}
    };
  }
})();
