goog.require('goog.uri.utils');
goog.require('ol.proj');

// Export required non-public api functions
goog.exportProperty(
  ol.geom.Polygon,
  'fromCircle',
  ol.geom.Polygon.fromCircle
);
goog.exportProperty(
  ol.geom.Polygon.prototype,
  'getFlatCoordinates',
  ol.geom.Polygon.prototype.getFlatCoordinates
);


goog.exportSymbol('ol.proj.get', ol.proj.get);
goog.exportSymbol('ol.proj.projections_', ol.proj.projections_);
goog.exportSymbol('ol.geom.flat.length.linearRing', ol.geom.flat.length.linearRing);
goog.exportSymbol('goog.uri.utils.getParamValue', goog.uri.utils.getParamValue);
goog.exportSymbol('goog.uri.utils.appendParams', goog.uri.utils.appendParams);


/**
 * Add access to pointerEvent property
 * @api
 */
ol.MapBrowserPointerEvent.prototype.getPointerEvent = function() {
  return this.pointerEvent;
};

// Define Ctrl+Shift condition test
ol.events.condition.ctrlShiftKeysOnly = function(mapBrowserEvent) {
  var browserEvent = mapBrowserEvent.originalEvent;
  return (browserEvent.ctrlKey && browserEvent.shiftKey);
};

// Alt+Shift is not usable to use on Linux, so replace it with Ctrl+Shift
if (navigator.platform.indexOf("Linux") !== -1) {
  ol.events.condition.altShiftKeysOnly = ol.events.condition.ctrlShiftKeysOnly;
}