(function() {
  'use strict';

  angular
    .module('gl.network')
    .provider('gislabClient', GislabClientProvider);

  function GislabClientProvider() {
    this.config = {};
  }

  GislabClientProvider.prototype.configure = function(config) {
    this.config = config;
  }

  GislabClientProvider.prototype.$get = ['$http', '$q', function($http, $q) {
    return new gislabClient(this.config, $http, $q);
  }];

  function gislabClient(config, $http, $q) {
    function GislabClient() {
      this.currentRequest = null;
      this.serverUrl = config.server || '';
      this.userInfo = {
        username: "guest",
        full_name: "Guest",
        is_guest: true
      };
    };

    GislabClient.prototype._deferredRequest = function(httpParams) {
      var deferredAbort = $q.defer();
      if (httpParams.url.indexOf("://") === -1) {
        httpParams.url = '{0}{1}'.format(this.serverUrl, httpParams.url);
      }
      httpParams.timeout = deferredAbort.promise;
      var request = $http(httpParams);
      var promise = request.then(
        function(response) {
          if (!angular.isFunction(response.headers) || !response.headers('X-Gisquick-Version')) {
            return $q.reject({
              invalid_server: true,
              canceled: false
            });
          }
          return response.data;
        }, function(response) {
          return $q.reject({
            invalid_server: response.headers('X-Gisquick-Version')? false : true,
            canceled: promise.canceled === true,
            status_code: response.status,
          });
        }
      );
      promise.abort = function() {
        promise.canceled = true;
        deferredAbort.resolve();
      }
      promise.finally(function() {
        promise.abort = angular.noop;
        deferredAbort = request = promise = null;
      });
      this.currentRequest = promise;
      return promise;
    };

    GislabClient.prototype.abortRequest = function() {
      if (this.currentRequest && this.currentRequest.abort) {
        this.currentRequest.abort();
      }
    };

    GislabClient.prototype.setServer = function(serverUrl) {
      this.serverUrl = serverUrl;
    };

    GislabClient.prototype.login = function(username, password) {
      var client = this;
      var promise = this._deferredRequest({
        url: '/login/',
        method: 'post',
        withCredentials: true,
        data: 'username={0}&password={1}'.format(username, password),
        headers: {'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8'}
      });

      promise.then(function(data) {
        client.userInfo = data;
      }, function(err) {
        client.userInfo = {};
      });
      return promise;
    };

    GislabClient.prototype.logout = function(project) {
      var client = this;
      return this.get('/logout/').then(function() {
        client.userInfo = {};
      });
    };

    GislabClient.prototype.project = function(project) {
      var url;
      if (project && project !== 'empty') {
        url = '/project.json?PROJECT={0}'.format(encodeURIComponent(project));
      } else {
        url = '/project.json';
      }
      return this._deferredRequest({
        url: url,
        method: 'get',
        withCredentials: true
      });
    };

    GislabClient.prototype.userProjects = function() {
      return this._deferredRequest({
        url: '/projects.json',
        method: 'get',
        withCredentials: true
      });
    };

    GislabClient.prototype.get = function(url, params, http_options) {
      var httpParams = {
        url: url,
        method: 'get',
        params: params,
        withCredentials: true
      };
      if (http_options) {
        httpParams = angular.extend(http_options, httpParams);
      }
      return this._deferredRequest(httpParams);
    };

    GislabClient.prototype.post = function(url, data) {
      return this._deferredRequest({
        url: url,
        method: 'post',
        withCredentials: true,
        data: data,
        headers: {'Content-Type': 'application/json; charset=UTF-8'}
      });
    };

    GislabClient.prototype.encodeUrl = function(url, params) {
      var query = [];
      for (name in params) {
        var value = params[name];
        if (angular.isDefined(value)) {
          query.push('{0}={1}'.format(name, encodeURIComponent(value)));
        }
      }
      if (url.indexOf("://") === -1) {
        url = this.serverUrl+url;
      }
      return url+'&'+query.join('&');
    }

    return new GislabClient();
  };
})();
