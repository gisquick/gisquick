(function() {
  'use strict';
  angular
    .module('gl.map')
    .factory('mapBuilder', [mapBuilder]);

  function mapBuilder() {

    /**
     * @constructor
     */
    function MapBuilder() {};

    /**
     * @param {object} config
     * @return {ol.Map}
     */
    MapBuilder.prototype.createMap = function(config) {

      if (!config.projection.code in ol.proj.projections_) {
        proj4.defs(config.projection.code, config.projection.proj4);
      }

      var layers = [];
      var baseLayers = this.createBaseLayers_(config.base_layers);
      layers = layers.concat(baseLayers);

      var overlaysLayer = this.createProjectLayer(config);
      if (overlaysLayer) {
        layers.push(overlaysLayer);
      }

      var projection = ol.proj.get(config.projection.code);
      var extent = projection.getExtent();

      var view = new ol.View({
          projection: projection,
          resolutions: config.resolutions,
          extent: extent
        });

      var controls = ol.control.defaults({
        attributionOptions: /** @type {olx.control.AttributionOptions} */
          (config.attributionOptions || {}),
        rotateOptions: /** @type {olx.control.RotateOptions} */
          (config.rotateOptions || {}),
        zoomOptions: /** @type {olx.control.ZoomOptions} */
          (config.zoomOptions || {})
      });

      var map = new ol.Map({
        layers: layers,
        view: view,
        controls: controls,
        renderer: 'canvas'
      });
      return map;
    };

    /**
     * @private
     * @param {Object} baseLayersCfg
     * @return {Array.<ol.layer.Layer>}
     */
    MapBuilder.prototype.createBaseLayers_ = function(baseLayersCfg) {

      var layers = [];

      var base_layers_configs = this.layersTreeToList(
          {layers: baseLayersCfg}, true);

      base_layers_configs.forEach(function(baselayer_config) {
        var baseLayer = this.createBaseLayer(baselayer_config);
        if (baseLayer) {
          layers.push(baseLayer);
        }
      }, this);

      return layers;

    };


    /**
     * @param {object} layersTree
     * @param {boolean} skip_groups
     */
    MapBuilder.prototype.layersTreeToList = function(layersTree, skipGroups) {
      var list = [];

      /**
       * @param {Array.<object>} list
       * @param {object} layerData
       * @param {number} depth
       */
      var visitNode = function(list, layerData, depth) {
        if (!depth) {
          depth = 0;
        }
        layerData.title = layerData.title ?
                           layerData.title :
                           layerData.name;

        layerData.depth = depth;

        if (layerData.layers) {

          if (!skipGroups && layerData.title) {
            layerData.isGroup = true;
            list.push(layerData);
          }

          var groupVisible = true;

          var isGroupVisible = function(childData) {
            visitNode(list, childData, depth + 1);
            if (!childData.visible) {
              groupVisible = false;
            }
          };

          layerData.layers.forEach(isGroupVisible);
          layerData.visible = groupVisible;

        } else if (layerData) {

          layerData.isGroup = false;
          list.push(layerData);

        }
        return list;
      };

      visitNode(list, layersTree);
      return list;
    };

    /**
     * create base layer based on given configuration
     * @param {object} config layer configuration
     * @return {ol.layer.Layer}
     */
    MapBuilder.prototype.createBaseLayer = function(config) {
      var baseLayer;
      var createLayer = MapBuilder.getCreateLayerFunction(config.type);

      if (createLayer) {
        baseLayer = createLayer(config);
        MapBuilder.decorateBaseLayer(baseLayer, config);
      }
      return baseLayer;
    };


    /**
     * creates single overlay layer, which combines all available layers in the
     * service
     * @param {object} config
     * @return {ol.layer.Tile}
     */
    MapBuilder.prototype.createProjectLayer = function(config) {

      var overlays_layer;
      if (!config.layers) {
        return null;
      }

      var layers_data = this.layersTreeToList({layers: config.layers}, true);
      var visibleLayers = [];
      var attributions = {};
      var layersOrder = {};

      /**
       * @param {object} layerConfig
       */
      var createAttributionsAndOrder = function(layerConfig) {
        if (layerConfig.visible) {
          visibleLayers.push(layerConfig.name);
        }
        layersOrder[layerConfig.name] = layerConfig.drawing_order;

        var attribution = layerConfig.attribution;

        if (attribution) {
          var attribution_html;
          if (attribution.url) {
            attribution_html = '<a href="{0}" target="_blank">{1}</a>'
                               .format(attribution.url, attribution.title);
          } else {
            attribution_html = attribution.title;
          }
          attributions[layerConfig.name] = new ol.Attribution({
            html: attribution_html
          });
        }
      };

      layers_data.forEach(createAttributionsAndOrder);

      if (config.mapcache_url) {
        config.type = 'mapcacheoverlay';
      } else {
        config.type = 'imagewmsoverlay';
      }


      var createLayer = MapBuilder.getCreateLayerFunction(config.type);

      if (createLayer) {
        config.visibleLayers = visibleLayers;
        config.attributions = attributions;
        config.layersOrder = layersOrder;

        overlays_layer = createLayer(config);
      }

      if (overlays_layer) {
        MapBuilder.decorateOverlay(overlays_layer, config);
      }

      return overlays_layer;
    };


    /**
     * get function for creating of layers based on given type
     * @param {string} type layer type
     * @memberof MapBuilder
     * @function
     * @static
     * @return {function}
     */
    MapBuilder.getCreateLayerFunction = function(type) {

      type = type.toLowerCase();
      switch (type) {
        case 'blank':
          return MapBuilder.createBlankLayer;
          break;
        case 'osm':
          return MapBuilder.createOSMLayer;
          break;
        case 'wms':
          return MapBuilder.createWMSLayer;
          break;
        case 'wmts':
          return MapBuilder.createWMTSLayer;
          break;
        case 'mapbox':
          return MapBuilder.createMapBoxLayer;
          break;
        case 'google':
          return MapBuilder.createGoogleLayer;
          break;
        case 'bing':
          return MapBuilder.createBingLayer;
          break;
        case 'mapcacheoverlay':
            return MapBuilder.createMapCacheOverlay;
          break;
        case 'imagewmsoverlay':
            return MapBuilder.createImageWMSOveraly;
          break;
      }
    };

    /**
     * @param {object} config
     * @return {ol.layer.Image}
     * @static
     * @function
     * @memberof MapBuilder
     */
    MapBuilder.createBlankLayer = function(config) {
        return new ol.layer.Image({
          extent: config.extent,
          visible: config.visible
        });
    };

    /**
     * @param {object} config
     * @return {ol.layer.Tile}
     * @static
     * @function
     * @memberof MapBuilder
     */
    MapBuilder.createOSMLayer = function(config) {
        return new ol.layer.Tile({
          source: new ol.source.OSM(),
          visible: config.visible || false
        });
    };

    /**
     * @param {object} config
     * @return {ol.layer.Image}
     * @static
     * @function
     * @memberof MapBuilder
     */
    MapBuilder.createWMSLayer = function(config) {
        return new ol.layer.Image({
          source: new ol.source.ImageWMS({
            url: config.url,
            resolutions: config.resolutions,
            params: {
              'LAYERS': config.wms_layers.join(','),
              'FORMAT': config.format,
              'TRANSPARENT': 'false'
            },
            serverType: 'mapserver'
          }),
          extent: config.extent
        });
    };


    /**
     * @param {MapBuilder.LayerConfig.WMTS} config
     * @return {ol.layer.Image}
     * @static
     * @function
     * @memberof MapBuilder
     */
    MapBuilder.createWMTSLayer = function(config) {

      var projection = ol.proj.get(config.projection);
      var extent = projection.getExtent();
      var resolutions = config.resolutions;
      var matrixIds = new Array(resolutions.length);

      for (var z = 0; z < resolutions.length; ++z) {
        matrixIds[z] = z;
      }

      var grid = new ol.tilegrid.WMTS({
        origin: ol.extent.getTopLeft(extent),
        resolutions: resolutions,
        matrixIds: matrixIds
      });

      var source = new ol.source.WMTS({
        attributions: config.attribution ?
                      [new ol.Attribution({html: config.attribution})] :
                      undefined,
        url: config.url,
        layer: config.layer,
        matrixSet: config.matrixSet,
        format: config.format,
        projection: projection,
        tileGrid: grid,
        style: config.style || 'default'
      });

      var layer = new ol.layer.Tile({
          opacity: config.opacity,
          extent: config.extent,
          source: source
      });

      return layer;
    };


    /**
     * @param {object} config layer configuration
     * @return {ol.layer.Tile}
     */
    MapBuilder.createMapCacheOverlay = function(config) {
      return new ol.layer.Tile({
          source: new ol.source.WebgisTileImage({
            project: config.project,
            tilesUrl: config.mapcache_url,
            legendUrl: config.legend_url,
            owsUrl: config.ows_url,
            projection: config.projection.code,
            tileGrid: new ol.tilegrid.TileGrid ({
              origin: ol.extent.getBottomLeft(config.project_extent),
              resolutions: config.tile_resolutions,
              tileSize: 256
            }),
            visibleLayers: config.visibleLayers,
            layersAttributions: config.attributions,
            layersOrder: config.layersOrder,
          }),
          extent: config.project_extent,
        });
    };


    /**
     * @param {object} config layer configuration
     * @return {ol.layer.Tile}
     */
    MapBuilder.createImageWMSOveraly = function(config) {
        return new ol.layer.Image({
          source: new ol.source.WebgisImageWMS({
            url: config.ows_url,
            visibleLayers: config.visibleLayers,
            layersAttributions: config.attributions,
            layersOrder: config.layersOrder,
            params: {
              'FORMAT': 'image/png'
            },
            serverType: 'qgis'
          }),
          extent: config.project_extent,
        });
    };


    /**
     * @param {object} config layer configuration
     * @return {ol.layer.Tile}
     */
    MapBuilder.createMapBoxLayer = function(config) {
        return new ol.layer.Tile({
          source: new ol.source.XYZ({
            url: 'http://api.tiles.mapbox.com/v4/' +
                 config.mapid +
                 '/{z}/{x}/{y}.png?access_token=' +
                 config.apikey
          })
        });
    };


    /**
     * @param {object} config layer configuration
     * @return {ol.layer.Tile}
     */
    MapBuilder.createBingLayer = function(config) {

        return new ol.layer.Tile({
          visible: false,
          preload: Infinity,
          source: new ol.source.BingMaps({
            key: config.apikey,
            imagerySet: config.style,
            maxZoom: 19
          })
        });
    };

    /**
     * decoreate base layer with aditional attributes
     * @static
     * @function
     * @memberof MapBuilder
     * @param {ol.layer.Layer} layer
     * @param {object} config
     * @return {ol.layer.Layer}
     */
    MapBuilder.decorateBaseLayer = function(layer, config) {
        layer.set('name', config.name);
        layer.set('type', 'baselayer');
        return layer;
    };
    

    /**
     * decoreate overlay layer with aditional attributes
     * @static
     * @function
     * @memberof MapBuilder
     * @param {ol.layer.Layer} layer
     * @param {object} config
     * @return {ol.layer.Layer}
     */
    MapBuilder.decorateOverlay = function(layer, config) {
        layer.set('type', 'qgislayer');
        layer.set('name', 'qgislayer');
        return layer;
    };

    return new MapBuilder();
  };

})();

/**
 * Configuration for WMTS layers
 * @typedef {Object} MapBuilder.LayerConfig.WMTS
 * @property {number} opacity
 * @property {string} attribution
 * @property {string} url
 * @property {string} layer
 * @property {string} extent
 * @property {string} matrixset
 * @property {string} format
 * @property {=string} style
 */
