(function() {
  'use strict';

  angular
    .module('gl.location')
    .factory('locationService', locationService);

  function locationService($q, staticResources) {
    function LocationService() {
      this.watchID = null;
      this.geolocation = new ol.Geolocation({
        trackingOptions: {
          timeout: 20000,
          enableHighAccuracy: true
        },
        tracking: false
      });
      this.trackingStyle = new ol.style.Style({
        image: new ol.style.Icon({
          anchor: [0.5, 0.5],
          anchorXUnits: 'fraction',
          anchorYUnits: 'fraction',
          //opacity: 0.75,
          rotateWithView: true,
          src: staticResources['geolocation-tracking']
        })
      });
      this.locationStyle = new ol.style.Style({
        image: new ol.style.Circle({
          radius: 8,
          fill: new ol.style.Fill({
            color: '#3399CC'
          }),
          stroke: new ol.style.Stroke({
            color: '#fff',
            width: 2
          })
        })
      });
    };

    LocationService.prototype._successHandler = function() {
      var coordinates = this.geolocation.getPosition();
      var location_point = this.locationFeature.getGeometry();
      if (location_point) {
        location_point.setCoordinates(coordinates);
      } else {
        this.locationFeature.setGeometry(new ol.geom.Point(coordinates));
      }
      this.accuracyFeature.setGeometry(this.geolocation.getAccuracyGeometry());
      if (this.geolocation.getTracking() ) {
        if (this.trackingCallback) {
          this.trackingCallback(this.geolocation);
        }
        // this.geolocation.set('heading', 30 * Math.PI / 180);
        // console.log(this.geolocation.getHeading());
        var heading = this.geolocation.getHeading() || 0;
        this.trackingStyle.getImage().setRotation(heading);
      }
    };

    LocationService.prototype._errorHandler = function(error) {
      console.log(error);
    };

    LocationService.prototype._activate = function(map) {
      this.map = map;
      var location_layer = map.getLayer('__location_layer');
      if (!location_layer) {
        console.log('creating location layer');
        this.geolocation.setProjection(map.getView().getProjection());
        var positionFeature = new ol.Feature();
        this.accuracyFeature = new ol.Feature();
        location_layer = new ol.layer.Vector({
          source: new ol.source.Vector({
            features: [
              positionFeature,
              this.accuracyFeature
            ]
          })
        });
        location_layer.set('name', '__location_layer');
        map.addLayer(location_layer);
        this.locationFeature = positionFeature;
      }
      location_layer.setVisible(true);
    };

    LocationService.prototype.startTracking = function(map, callback) {
      this.trackingCallback = callback;
      this.trackingModeEnabled = true;
      this._clearWatchers();
      this._activate(map);

      this.locationFeature.setStyle(this.trackingStyle);

      // this.geolocation.on('change:position', this._successHandler, this);
      this._changeKeyListener = this.geolocation.on('change', this._successHandler, this);
      this._errorKeyListener = this.geolocation.on('error', this._errorHandler, this);

      this.geolocation.setTracking(true);
    };

    LocationService.prototype.showPosition = function(map) {
      this.trackingCallback = null;
      var task = $q.defer();

      this._changeKeyListener = this.geolocation.once('change', function() {
        if (!this.trackingModeEnabled) {
          this.geolocation.setTracking(false);
          this._clearWatchers();
        }
        this._successHandler();
        task.resolve(this.geolocation);
      }, this);

      this._errorKeyListener = this.geolocation.once('error', task.reject);

      this._activate(map);
      this.locationFeature.setStyle(this.locationStyle);
      this.geolocation.setTracking(true);
      return task.promise;
    };

    LocationService.prototype.lastKnownPosition = function() {
      return this.geolocation.getPosition();
    };

    LocationService.prototype._clearWatchers = function() {
      if (this._changeKeyListener) {
        this.geolocation.un('change', this._changeKeyListener);
        this._changeKeyListener = null;
      }
      if (this._errorKeyListener) {
        this.geolocation.un('error', this._errorKeyListener);
        this._errorKeyListener = null;
      }
    };

    LocationService.prototype.deactivate = function(map) {
      this.geolocation.setTracking(false);
      this.trackingModeEnabled = false;
      this._clearWatchers();
      var location_layer = map.getLayer('__location_layer');
      if (location_layer) {
        location_layer.setVisible(false);
      }
    };

    return new LocationService();
  };
})();
