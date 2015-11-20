(function() {
  'use strict';

  angular
    .module('gl.location')
    .factory('locationService', [locationService]);

  function locationService() {
    function LocationService() {
      this.watchID = null;
      this.autoPan = false;
    };

    LocationService.prototype._successHandler = function(position) {
      var coordinates = [position.coords.longitude, position.coords.latitude];
      if (this.map.getView().getProjection().getCode() !== 'EPSG:4326') {
        coordinates = ol.proj.transform(coordinates, 'EPSG:4326',this.map.getView().getProjection().getCode());
      }
      var location_point = this.locationFeature.getGeometry();
      if (location_point) {
        location_point.setCoordinates(coordinates);
      } else {
        this.locationFeature.setGeometry(new ol.geom.Point(coordinates));
      }
      if (this.autoPan) {
        var pan = ol.animation.pan({
          duration: 300,
          source: this.map.getView().getCenter()
        });
        this.map.beforeRender(pan);
        this.map.getView().setCenter(coordinates);
      }
    };

    LocationService.prototype._errorHandler = function(error) {
      console.log(error);
    };

    LocationService.prototype.activate = function(map, options) {
      options = options || {timeout: 20000, enableHighAccuracy: true, frequency: 5000};
      if (this.watchID !== null) {
        this.deactivate();
      }

      this.map = map;
      var location_layer = map.getLayer('__location_layer');
      if (!location_layer) {
        console.log('creating location layer');

        var style = new ol.style.Style({
          image: new ol.style.Icon(/** @type {olx.style.IconOptions} */ ({
            anchor: [0.5, 1.0],
            anchorXUnits: 'fraction',
            anchorYUnits: 'fraction',
            //opacity: 0.75,
            src: 'images/location.png'
          }))
        });

        var location_marker = new ol.Feature({});
        location_marker.setStyle(style);
        location_layer = new ol.layer.Vector({
          source: new ol.source.Vector({
            features: [
              location_marker
            ]
          })
        });
        location_layer.set('name', '__location_layer');
        map.addLayer(location_layer);
        this.locationFeature = location_marker;
      }
      location_layer.setVisible(true);

      navigator.geolocation.getCurrentPosition(this._successHandler.bind(this), this._errorHandler.bind(this), options);
      this.watchID = navigator.geolocation.watchPosition(this._successHandler.bind(this), this._errorHandler.bind(this), options);
    };

    LocationService.prototype.deactivate = function(map) {
      if (this.watchID !== null) {
        console.log("--------stopping GPS--------");
        navigator.geolocation.clearWatch(this.watchID);
        this.watchID = null;
      }
      var location_layer = map.getLayer('__location_layer');
      if (location_layer) {
        location_layer.setVisible(false);
      }
    };

    LocationService.prototype.setAutoPan = function(autoPan) {
      this.autoPan = autoPan;
    };

    return new LocationService();
  };
})();
