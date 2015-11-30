(function() {
  'use strict';

  angular
    .module('gl.mobile')
    .factory('gislabMobileClient', gislabMobileClient);

  function gislabMobileClient($http, $q, gislabClient) {
    function GislabMobileClient() {
    };

    GislabMobileClient.prototype.abortRequest = function() {
      gislabClient.abortRequest();
    };

    GislabMobileClient.prototype.login = function(server, username, password) {
      this.serverUrl = 'https://{0}'.format(server);
      gislabClient.setServer(this.serverUrl);
      if (username && password) {

        return gislabClient.post(
          '/mobile/login/',
          {
            username: username,
            password: password
          }
        );
      } else {
        return $q.when();
      }
      /*
      return $http({
        method: 'POST',
        url: '{0}/mobile/login/'.format(this.getServerUrl(server)),
        headers: {'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8'},
        transformRequest: function(obj) {
          var str = [];
          for(var p in obj)
          str.push(encodeURIComponent(p) + "=" + encodeURIComponent(obj[p]));
          return str.join("&");
        },
        data: {username: username, password: password},
      });*/
    };

    GislabMobileClient.prototype.logout = function() {
      if (this.serverUrl) {
        return gislabClient.post('/mobile/logout/', {});
      } else {
        return $q.when();
      }
    }

    GislabMobileClient.prototype.get = function(url, params) {
      return gislabClient.get(url, params);
    }

    GislabMobileClient.prototype.post = function(url, data) {
      return gislabClient.post(url, data);
    }

    GislabMobileClient.prototype.project = function(project) {
      return gislabClient.project(project);
    };

    GislabMobileClient.prototype.userProjects = function() {
      return gislabClient.userProjects();
    };

    return new GislabMobileClient();
  };
})();
