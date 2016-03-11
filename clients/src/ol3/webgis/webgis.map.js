goog.require('ol.source.TileImage');
goog.require('ol.source.ImageWMS');
goog.require('goog.uri.utils');
goog.require('ol.proj');

goog.provide('ol.source.WebgisTileImage');
goog.provide('ol.source.WebgisImageWMS');

/**
 * @classdesc
 * Source for ...
 *
 * @constructor
 * @extends {ol.source.TileImage}
 * @param {olx.source.WebgisTileImageOptions} options Tile source options.
 * @api stable
 */
ol.source.WebgisTileImage = function(options) {

  // goog.base(this, {
  //   attributions: options.attributions,
  //   extent: options.extent,
  //   logo: options.logo,
  //   opaque: options.opaque,
  //   projection: options.projection,
  //   state: options.state !== undefined ?
  //     /** @type {ol.source.State} */ (options.state) : undefined,
  //   tileGrid: options.tileGrid,
  //   tilePixelRatio: options.tilePixelRatio,
  //   wrapX: options.wrapX
  // });

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
 * @api
 */
ol.source.WebgisTileImage.prototype.getVisibleLayers = function() {
  return this.visibleLayers;
};

/**
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

/**
 * @api
 */
ol.source.WebgisTileImage.prototype.getGetFeatureInfoUrl = function(map, coordinates, layers, limit) {
  var size = map.getSize();
  var layersString = (layers || this.visibleLayers).join(',');
  var params = {
    'SERVICE': 'WMS',
    'VERSION': '1.1.1',
    'REQUEST': 'GetFeatureInfo',
    'INFO_FORMAT': 'application/vnd.ogc.gml',
    'FEATURE_COUNT': limit || 10,
    'SRS': map.getView().getProjection().getCode(),
    'LAYERS': layersString,
    'QUERY_LAYERS': layersString,
    'BBOX': map.getView().calculateExtent(size).join(','),
    'WIDTH': size[0],
    'HEIGHT': size[1],
    'X': coordinates[0],
    'Y': coordinates[1]
  };
  return goog.uri.utils.appendParamsFromMap(this.owsUrl, params);
};

/**
 * @classdesc
 * Source for ...
 *
 * @constructor
 * @extends {ol.source.ImageWMS}
 * @param {olx.source.WebgisImageWMSOptions} options Options for WMS source.
 * @api stable
 */
ol.source.WebgisImageWMS = function(options) {
  // goog.base(this, {
  //   attributions: options.attributions,
  //   crossOrigin: options.crossOrigin,
  //   hidpi: options.hidpi,
  //   serverType: options.serverType,
  //   logo: options.logo,
  //   imageLoadFunction: options.imageLoadFunction,
  //   params: options.params,
  //   projection: options.projection,
  //   ratio: options.ratio,
  //   resolutions: options.resolutions,
  //   url: options.url
  // });
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
 * @api
 */
ol.source.WebgisImageWMS.prototype.getVisibleLayers = function() {
  return this.visibleLayers;
};

/**
 * @api
 */
ol.source.WebgisImageWMS.prototype.getLegendUrl = function(layername, view) {
  var legendUrl = goog.uri.utils.appendParamsFromMap(this.legendUrlTemplate, {
    'LAYER': layername,
    'SCALE': Math.round(view.getScale()).toString()
  });
  return legendUrl;
};

/**
 * @api
 * @override
 */
ol.source.WebgisImageWMS.prototype.getGetFeatureInfoUrl = function(map, coordinates, layers, limit) {
  var size = map.getSize();
  var layersString = (layers || this.visibleLayers).join(',');
  var params = {
    'SERVICE': 'WMS',
    'VERSION': '1.1.1',
    'REQUEST': 'GetFeatureInfo',
    'INFO_FORMAT': 'application/vnd.ogc.gml',
    'FEATURE_COUNT': limit || 10,
    'SRS': map.getView().getProjection().getCode(),
    'LAYERS': layersString,
    'QUERY_LAYERS': layersString,
    'BBOX': map.getView().calculateExtent(size).join(','),
    'WIDTH': size[0],
    'HEIGHT': size[1],
    'X': coordinates[0],
    'Y': coordinates[1]
  };
  return goog.uri.utils.appendParamsFromMap(this.getUrl(), params);
};


ol.Map.prototype.getLayer = function(name) {
  var layer;
  this.getLayers().forEach(function(l) {
    if (name == l.get('name')) {
      layer = l;
    }
  });
  return layer;
};

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

ol.View.prototype.getScale = function() {
  var resolution = this.getResolution();
  var units = this.getProjection().getUnits();
  var dpi = 25.4 / 0.28;
  var mpu = ol.proj.METERS_PER_UNIT[units];
  var scale = resolution * mpu * 39.37 * dpi;
  return scale;
};

ol.Map.prototype.fitAnimated = function(extent, options) {
  var pan = ol.animation.pan({
    duration: 300,
    source: this.getView().getCenter()
  });
  var zoom = ol.animation.zoom({
    duration: 300,
    resolution: this.getView().getResolution()
  });
  this.beforeRender(pan, zoom);
  this.getView().fit(extent, this.getSize(), options);
}

ol.MapBrowserPointerEvent.prototype.getPointerEvent = function() {
  return this.pointerEvent;
};

goog.exportProperty(ol.Map.prototype, 'getLayer', ol.Map.prototype.getLayer);
goog.exportProperty(ol.Map.prototype, 'getControlByClass', ol.Map.prototype.getControlByClass);
goog.exportProperty(ol.Map.prototype, 'fitAnimated', ol.Map.prototype.fitAnimated);

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
goog.exportProperty(
  ol.MapBrowserPointerEvent.prototype,
  'getPointerEvent',
  ol.MapBrowserPointerEvent.prototype.getPointerEvent
);

goog.exportSymbol('ol.proj.get', ol.proj.get);
goog.exportSymbol('ol.proj.projections_', ol.proj.projections_);
goog.exportSymbol('ol.geom.flat.length.linearRing', ol.geom.flat.length.linearRing);
goog.exportSymbol('goog.uri.utils.getParamValue', goog.uri.utils.getParamValue);
goog.exportSymbol('goog.uri.utils.appendParams', goog.uri.utils.appendParams);


// Define Ctrl+Shift condition test
ol.events.condition.ctrlShiftKeysOnly = function(mapBrowserEvent) {
  var browserEvent = mapBrowserEvent.originalEvent;
  return (browserEvent.ctrlKey && browserEvent.shiftKey);
};

// Alt+Shift is not usable to use on Linux, so replace it with Ctrl+Shift
if (navigator.platform.indexOf("Linux") !== -1) {
  ol.events.condition.altShiftKeysOnly = ol.events.condition.ctrlShiftKeysOnly;
}