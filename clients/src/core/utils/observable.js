(function() {
  'use strict';

  angular
    .module('gl.utils')
    .value('Observable', Observable);


  function Observable(events) {
    this.eventListeners = {};
    events.forEach(function(event) {
      this.eventListeners[event] = [];
    }, this);
  }

  Observable.prototype.dispatchEvent = function(event, data) {
    var listenerCallback = function(listener) {
      if (listener._oneTimeListener) {
        var index = this.eventListeners[event].indexOf(listener);
        this.eventListeners[event].splice(index, 1);
      }
      return listener(data);
    }.bind(this);
    var listeners = this.eventListeners[event].concat([]);
    listeners.some(listenerCallback);
  };


  /**
   * Listen for a certain type of event
   * @param {string} event Name of the event
   * @param {function(?): ?} listener The listener function
   */
  Observable.prototype.on = function(event, listener) {
    this.eventListeners[event].push(listener);
    listener._oneTimeListener = false;
  };

  /**
   * Unlisten for a certain type of event
   * @param {string} event Name of the event
   * @param {function(?): ?} listener The listener function
   */
  Observable.prototype.un = function(event, listener) {
    var index = this.eventListeners[event].indexOf(listener);
    if (index !== -1) {
      this.eventListeners[event].splice(index, 1);
    }
  };

  /**
   * Listen once for a certain type of event
   * @param {string} event Name of the event
   * @param {function(?): ?} listener The listener function
   */
  Observable.prototype.once = function(event, listener) {
    this.eventListeners[event].push(listener);
    listener._oneTimeListener = true;
  };

})();
