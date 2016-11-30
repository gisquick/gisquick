goog.require('ol.Map');

/**
 * OpenLayers Map extensions
 */


/**
 * Returns map layer with given name (set by layer.set('name', layername))
 * @param {string} name Layer name
 * @return {ol.layer.Layer}
 * @api
 */
ol.Map.prototype.getLayer = function(name) {
  var layer;
  this.getLayers().forEach(function(l) {
    if (name == l.get('name')) {
      layer = l;
    }
  });
  return layer;
};

/**
 * Returns map's control object with given class
 * @param {ol.control.<Class>} clazz Particular map control class
 * @return {ol.control.<Class>}
 * @api
 */
ol.Map.prototype.getControlByClass = function(clazz) {
  var control;
  this.getControls().getArray().some(function(ctrl) {
    if (ctrl instanceof clazz) {
      control = ctrl;
      return true;
    }
  });
  return control;
};

/**
 * Returns map's interaction object with given class
 * @param {ol.interaction.<Class>} clazz Particular map interaction class
 * @return {ol.interaction.<Class>}
 * @api
 */
ol.Map.prototype.getInteractionByClass = function(clazz) {
  var interaction;
  this.getInteractions().getArray().some(function(obj) {
    if (obj instanceof clazz) {
      interaction = obj;
      return true;
    }
  });
  return interaction;
};

/**
 * Fit given geometry or extent on map view with move and zoom animation.
 * @param {ol.geom.SimpleGeometry | ol.Extent} geometry Geometry or extent in map coordinates
 * @param {Options} options Same as options in ol.View.fit
 * @param {int} duration Duration of animation in millisecond
 * @api
 */
ol.Map.prototype.fitAnimated = function(geometry, options, duration) {
  duration = duration || 350;
  var pan = ol.animation.pan({
    duration: duration,
    source: this.getView().getCenter()
  });
  var zoom = ol.animation.zoom({
    duration: duration,
    resolution: this.getView().getResolution()
  });
  this.beforeRender(pan, zoom);
  this.getView().fit(geometry, this.getSize(), options);
};

/**
 * Stab function for pre-processing browser events on map canvas.
 * @param {Event} browserEvent Browser event.
 * @param {string=} opt_type Type.
 * @api
 */
ol.Map.prototype.transformBrowserEvent = function(browserEvent, opt_type) {};

/** Wrapper for ol.Map.handleMapBrowserEvent which allows to pre-process event **/
var handleMapBrowserEvent = ol.Map.prototype.handleMapBrowserEvent;
ol.Map.prototype.handleMapBrowserEvent = function(browserEvent, opt_type) {
  this.transformBrowserEvent(browserEvent, opt_type);
  return handleMapBrowserEvent.call(this, browserEvent, opt_type);
}
