goog.require('ol.source.TileImage');
goog.require('goog.uri.utils');

goog.provide('ol.source.WebgisTileImage');

/**
 * @classdesc
 * Tile layer source with extensions for GIS.lab Web app. Handles all qgis
 * project layers as one source.
 *
 * @constructor
 * @extends {ol.source.TileImage}
 * @param {olx.source.WebgisTileImageOptions} options Tile source options.
 * @api stable
 */
ol.source.WebgisTileImage = function(options) {
  goog.base(this,  /** @type {olx.source.TileImageOptions} */ (options));
  this.tilesUrl = goog.isDef(options.tilesUrl) ? options.tilesUrl : '';
  this.owsUrl = goog.isDef(options.owsUrl) ? options.owsUrl : '';
  this.project = goog.isDef(options.project) ? options.project : '';
  this.layersAttributions = goog.isDef(options.layersAttributions) ?
    options.layersAttributions : {};
  this.layersOrder = goog.isDef(options.layersOrder) ? options.layersOrder : {};
  this.tileUrlFunction = this._tileUrlFunction;

  // create legend url tempalte
  if (goog.isDef(options.legendUrl)) {
    var base_params = {
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
      'ICONLABELSPACE': '6',
      'PROJECT': this.project
    };
    this.legendUrlTemplate = options.legendUrl + '{hash}/{zoom}.png';
    this.legendUrlTemplate = goog.uri.utils.appendParamsFromMap(
      this.legendUrlTemplate,
      base_params
    );
  }
  this.setVisibleLayers(
    goog.isDef(options.visibleLayers) ? options.visibleLayers : []
  );
};
goog.inherits(ol.source.WebgisTileImage, ol.source.TileImage);

ol.source.WebgisTileImage.prototype._tileUrlFunction =
  function(tileCoord, pixelRatio, projection) {
  var z = tileCoord[0];
  var x = tileCoord[1];
  var y = tileCoord[2];
  var url = this.tileUrlTemplate
    .replace('{z}', z.toString())
    .replace('{x}', x.toString())
    .replace('{y}', y.toString());
  return url;
};

/**
 * Set visible layers
 * @param {Array.<string>} layers List of visible layers (names)
 * @api
 */
ol.source.WebgisTileImage.prototype.setVisibleLayers = function(layers) {
  var ordered_layers = [].concat(layers);
  ordered_layers.sort(function(l1, l2) {
    return this.layersOrder[l2] - this.layersOrder[l1];
  }.bind(this));
  this.visibleLayers = ordered_layers;
  var layers_names = ordered_layers.join(",");
  this.tileUrlTemplate = "{mapcache_url}{hash}/{z}/{x}/{y}.png?PROJECT={project}&LAYERS={layers}"
    .replace('{mapcache_url}', this.tilesUrl)
    .replace('{hash}', CryptoJS.MD5(layers_names).toString())
    .replace('{project}', this.project)
    .replace('{layers}', layers_names);
  this.tileCache.clear();

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
  this.changed();
};

/**
 * Returns list of visible layers (names)
 * @return {Array.<string>}
 * @api
 */
ol.source.WebgisTileImage.prototype.getVisibleLayers = function() {
  return this.visibleLayers;
};

/**
 * Returns legend url of layer at given map view
 * @param {string} layername Layer name
 * @param {ol.View} view Map view
 * @return {string}
 * @api
 */
ol.source.WebgisTileImage.prototype.getLegendUrl = function(layername, view) {
  var tile_grid = this.getTileGrid();
  var zoom_level = tile_grid.getZForResolution(view.getResolution());
  var legendUrl = this.legendUrlTemplate
    .replace('{hash}', CryptoJS.MD5(layername).toString())
    .replace('{zoom}', Number(zoom_level).toString());
  legendUrl = goog.uri.utils.appendParamsFromMap(legendUrl, {
    'LAYER': layername,
    'SCALE': Math.round(view.getScale()).toString()
  });
  return legendUrl;
};
