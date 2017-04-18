goog.require('ol.source.ImageWMS');
goog.require('goog.uri.utils');

goog.provide('ol.source.WebgisImageWMS');

/**
 * @classdesc
 * WMS layer source with extensions for Gisquick app. Handles all qgis
 * project layers as one source.
 *
 * @constructor
 * @extends {ol.source.ImageWMS}
 * @param {olx.source.WebgisImageWMSOptions} options Options for WMS source.
 * @api stable
 */
ol.source.WebgisImageWMS = function(options) {
  goog.base(this,  /** @type {olx.source.WebgisImageWMSOptions} */ (options));
  this.layersAttributions = goog.isDef(options.layersAttributions) ? options.layersAttributions : {};
  this.layersOrder = goog.isDef(options.layersOrder) ? options.layersOrder : {};
  var legendUrlParams = {
    'SERVICE': 'WMS',
    'VERSION': '1.1.1',
    'REQUEST': 'GetLegendGraphic',
    'EXCEPTIONS': 'application/vnd.ogc.se_xml',
    'FORMAT': 'image/png',
    'SYMBOLHEIGHT': '4',
    'SYMBOLWIDTH': '6',
    'LAYERFONTSIZE': '10',
    'LAYERFONTBOLD': 'true',
    'ITEMFONTSIZE': '11',
    'ICONLABELSPACE': '6'
  };
  this.legendUrlTemplate = goog.uri.utils.appendParamsFromMap(options.url, legendUrlParams);
  this.setVisibleLayers(goog.isDef(options.visibleLayers) ? options.visibleLayers : []);
};
goog.inherits(ol.source.WebgisImageWMS, ol.source.ImageWMS);

/**
 * Set visible layers
 * @param {Array.<string>} layers List of visible layers (names)
 * @api
 */
ol.source.WebgisImageWMS.prototype.setVisibleLayers = function(layers) {
  var ordered_layers = [].concat(layers);
  ordered_layers.sort(function(l2, l1) {
    return this.layersOrder[l1]-this.layersOrder[l2];
  }.bind(this));
  // update attributions
  if (this.layersAttributions) {
    var attributions = [];
    var attributions_html = [];
    ordered_layers.forEach(function(layername) {
      var attribution = this.layersAttributions[layername];
      if (attribution && attributions_html.indexOf(attribution.getHTML()) == -1) {
        attributions.push(attribution);
        attributions_html.push(attribution.getHTML());
      }
    }, this);
    this.setAttributions(attributions);
  }
  this.updateParams({'LAYERS': ordered_layers.join(",")});
  this.visibleLayers = ordered_layers;
};

/**
 * Returns list of visible layers (names)
 * @return {Array.<string>}
 * @api
 */
ol.source.WebgisImageWMS.prototype.getVisibleLayers = function() {
  return this.visibleLayers;
};

/**
 * Returns legend url of layer at given map view
 * @param {string} layername Layer name
 * @param {ol.View} view Map view
 * @return {string}
 * @api
 */
ol.source.WebgisImageWMS.prototype.getLegendUrl = function(layername, view) {
  var legendUrl = goog.uri.utils.appendParamsFromMap(this.legendUrlTemplate, {
    'LAYER': layername,
    'SCALE': Math.round(view.getScale()).toString()
  });
  return legendUrl;
};
