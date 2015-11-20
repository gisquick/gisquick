var olx;

/**
 * @typedef {{
 *     project: (string|undefined),
 *     tilesUrl: (string|undefined),
       owsUrl: (string|undefined),
 *     legendUrl: (string|undefined),
 *     visibleLayers: (Array.<string>|undefined),
 *     layersOrder: (Object.<string,*>|undefined),
 *     layersAttributions: (Object.<string,ol.Attribution>|undefined),
 *     attributions: (Array.<ol.Attribution>|undefined),
 *     crossOrigin: (null|string|undefined),
 *     logo: (string|olx.LogoOptions|undefined),
 *     opaque: (boolean|undefined),
 *     projection: ol.proj.ProjectionLike,
 *     state: (ol.source.State|string|undefined),
 *     tileClass: (function(new: ol.ImageTile, ol.TileCoord,
 *                          ol.TileState, string, ?string,
 *                          ol.TileLoadFunctionType)|undefined),
 *     tileGrid: (ol.tilegrid.TileGrid|undefined),
 *     tileLoadFunction: (ol.TileLoadFunctionType|undefined),
 *     tilePixelRatio: (number|undefined),
 *     tileUrlFunction: (ol.TileUrlFunctionType|undefined),
 *     wrapX: (boolean|undefined)
 * }}
 * @api
 */
olx.source.WebgisTileImageOptions;


/**
 * Project path.
 * @type {string|undefined}
 * @api
 */
olx.source.WebgisTileImageOptions.prototype.project;

/**
 * Tiles URL.
 * @type {string|undefined}
 * @api
 */
olx.source.WebgisTileImageOptions.prototype.tilesUrl;

/**
 * OWS Server URL.
 * @type {string|undefined}
 * @api
 */
olx.source.WebgisTileImageOptions.prototype.owsUrl;

/**
 * Legend URL.
 * @type {string|undefined}
 * @api
 */
olx.source.WebgisTileImageOptions.prototype.legendUrl;

/**
 * List of visible layers.
 * @type {Array.<string>|undefined}
 * @api
 */
olx.source.WebgisTileImageOptions.prototype.visibleLayers;

/**
 * Layers order.
 * @type {Object.<string,*>|undefined}
 * @api
 */
olx.source.WebgisTileImageOptions.prototype.layersOrder;

/**
 * Layers attributions.
 * @type {Object.<string,ol.Attribution>|undefined}
 * @api
 */
olx.source.WebgisTileImageOptions.prototype.layersAttributions;


/**
 * Attributions.
 * @type {Array.<ol.Attribution>|undefined}
 * @api
 */

olx.source.WebgisTileImageOptions.prototype.attributions;

/**
 * The `crossOrigin` attribute for loaded images.  Note that you must provide a
 * `crossOrigin` value if you are using the WebGL renderer or if you want to
 * access pixel data with the Canvas renderer.  See
 * {@link https://developer.mozilla.org/en-US/docs/Web/HTML/CORS_enabled_image}
 * for more detail.
 * @type {null|string|undefined}
 * @api
 */
olx.source.WebgisTileImageOptions.prototype.crossOrigin;

/**
 * Logo.
 * @type {string|olx.LogoOptions|undefined}
 * @api
 */
olx.source.WebgisTileImageOptions.prototype.logo;

/**
 * Whether the layer is opaque.
 * @type {boolean|undefined}
 * @api
 */
olx.source.WebgisTileImageOptions.prototype.opaque;

/**
 * Projection.
 * @type {ol.proj.ProjectionLike}
 * @api
 */
olx.source.WebgisTileImageOptions.prototype.projection;

/**
 * Source state.
 * @type {ol.source.State|string|undefined}
 * @api
 */
olx.source.WebgisTileImageOptions.prototype.state;

/**
 * Class used to instantiate image tiles. Default is {@link ol.ImageTile}.
 * @type {function(new: ol.ImageTile, ol.TileCoord,
 *                 ol.TileState, string, ?string,
 *                 ol.TileLoadFunctionType)|undefined}
 * @api
 */
olx.source.WebgisTileImageOptions.prototype.tileClass;

/**
 * Tile grid.
 * @type {ol.tilegrid.TileGrid|undefined}
 * @api
 */
olx.source.WebgisTileImageOptions.prototype.tileGrid;

/**
 * Optional function to load a tile given a URL.
 * @type {ol.TileLoadFunctionType|undefined}
 * @api
 */
olx.source.WebgisTileImageOptions.prototype.tileLoadFunction;

/**
 * The pixel ratio used by the tile service. For example, if the tile
 * service advertizes 256px by 256px tiles but actually sends 512px
 * by 512px images (for retina/hidpi devices) then `tilePixelRatio`
 * should be set to `2`. Default is `1`.
 * @type {number|undefined}
 * @api
 */
olx.source.WebgisTileImageOptions.prototype.tilePixelRatio;

/**
 * Optional function to get tile URL given a tile coordinate and the projection.
 * @type {ol.TileUrlFunctionType|undefined}
 * @api
 */
olx.source.WebgisTileImageOptions.prototype.tileUrlFunction;

/**
 * Whether to wrap the world horizontally. The default, `undefined`, is to
 * request out-of-bounds tiles from the server. When set to `false`, only one
 * world will be rendered. When set to `true`, tiles will be requested for one
 * world only, but they will be wrapped horizontally to render multiple worlds.
 * @type {boolean|undefined}
 * @api
 */
olx.source.WebgisTileImageOptions.prototype.wrapX;


/**
 * @typedef {{
 *     visibleLayers: (Array.<string>|undefined),
 *     layersOrder: (Object.<string,*>|undefined),
 *     layersAttributions: (Object.<string,ol.Attribution>|undefined),
 *
 *     attributions: (Array.<ol.Attribution>|undefined),
 *     crossOrigin: (null|string|undefined),
 *     hidpi: (boolean|undefined),
 *     serverType: (ol.source.wms.ServerType|string|undefined),
 *     logo: (string|olx.LogoOptions|undefined),
 *     imageLoadFunction: (ol.ImageLoadFunctionType|undefined),
 *     params: Object.<string,*>,
 *     projection: ol.proj.ProjectionLike,
 *     ratio: (number|undefined),
 *     resolutions: (Array.<number>|undefined),
 *     url: (string|undefined)}}
 * }}
 * @api
 */
olx.source.ImageWMSOptions;

/**
 * List of visible layers.
 * @type {Array.<string>|undefined}
 * @api
 */
olx.source.ImageWMSOptions.prototype.visibleLayers;

/**
 * Layers order.
 * @type {Object.<string,*>|undefined}
 * @api
 */
olx.source.ImageWMSOptions.prototype.layersOrder;

/**
 * Layers attributions.
 * @type {Object.<string,ol.Attribution>|undefined}
 * @api
 */
olx.source.ImageWMSOptions.prototype.layersAttributions;


/**
 * Attributions.
 * @type {Array.<ol.Attribution>|undefined}
 * @api stable
 */
olx.source.ImageWMSOptions.prototype.attributions;

/**
 * The `crossOrigin` attribute for loaded images.  Note that you must provide a
 * `crossOrigin` value if you are using the WebGL renderer or if you want to
 * access pixel data with the Canvas renderer.  See
 * {@link https://developer.mozilla.org/en-US/docs/Web/HTML/CORS_enabled_image}
 * for more detail.
 * @type {null|string|undefined}
 * @api stable
 */
olx.source.ImageWMSOptions.prototype.crossOrigin;

/**
 * Use the `ol.Map#pixelRatio` value when requesting the image from the remote
 * server. Default is `true`.
 * @type {boolean|undefined}
 * @api
 */
olx.source.ImageWMSOptions.prototype.hidpi;

/**
 * The type of the remote WMS server: `mapserver`, `geoserver` or `qgis`. Only
 * needed if `hidpi` is `true`. Default is `undefined`.
 * @type {ol.source.wms.ServerType|string|undefined}
 * @api
 */
olx.source.ImageWMSOptions.prototype.serverType;

/**
 * Optional function to load an image given a URL.
 * @type {ol.TileLoadFunctionType|undefined}
 * @api
 */
olx.source.ImageWMSOptions.prototype.imageLoadFunction;

/**
 * Logo.
 * @type {string|olx.LogoOptions|undefined}
 * @api stable
 */
olx.source.ImageWMSOptions.prototype.logo;

/**
 * WMS request parameters. At least a `LAYERS` param is required. `STYLES` is
 * `''` by default. `VERSION` is `1.3.0` by default. `WIDTH`, `HEIGHT`, `BBOX`
 * and `CRS` (`SRS` for WMS version < 1.3.0) will be set dynamically.
 * @type {Object.<string,*>}
 * @api stable
 */
olx.source.ImageWMSOptions.prototype.params;

/**
 * Projection.
 * @type {ol.proj.ProjectionLike}
 * @api
 */
olx.source.ImageWMSOptions.prototype.projection;

/**
 * Ratio. `1` means image requests are the size of the map viewport, `2` means
 * twice the width and height of the map viewport, and so on. Must be `1` or
 * higher. Default is `1.5`.
 * @type {number|undefined}
 * @api stable
 */
olx.source.ImageWMSOptions.prototype.ratio;

/**
 * Resolutions. If specified, requests will be made for these resolutions only.
 * @type {Array.<number>|undefined}
 * @api stable
 */
olx.source.ImageWMSOptions.prototype.resolutions;

/**
 * WMS service URL.
 * @type {string|undefined}
 * @api stable
 */
olx.source.ImageWMSOptions.prototype.url;

var CryptoJS;

/**
 * MD5 ...
 * @param {string} layer names
 * @return {Object}
 */
CryptoJS.MD5;
