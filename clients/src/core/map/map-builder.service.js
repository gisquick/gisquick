(function() {
  'use strict';

  angular
    .module('gl.map')
    .factory('mapBuilder', [mapBuilder]);

  function mapBuilder() {
    function MapBuilder() {};

    MapBuilder.prototype.layersTreeToList = function(layers_tree, skip_groups) {
      var list = [];
      var visit_node = function(list, layer_data, depth) {
        if (!depth) {
          depth = 0;
        }
        layer_data.title = layer_data.title? layer_data.title : layer_data.name;
        layer_data.depth = depth;
        if (layer_data.layers) {
          if (!skip_groups && layer_data.title) {
            layer_data.isGroup = true;
            list.push(layer_data);
          }
          var group_visible = true;
          layer_data.layers.forEach(function(child_data) {
            visit_node(list, child_data, depth+1);
            if (!child_data.visible) {
              group_visible = false;
            }
          });
          layer_data.visible = group_visible;
        } else if (layer_data) {
          layer_data.isGroup = false;
          list.push(layer_data);
        }
        return list;
      };
      visit_node(list, layers_tree);
      return list;
    };

    MapBuilder.prototype.createBaseLayer = function(config) {
      var base_layer;
      if (config.type === 'BLANK') {
        base_layer = new ol.layer.Image({
          extent: config.extent,
          visible: config.visible
        });
      } else if (config.type === 'OSM') {
        base_layer = new ol.layer.Tile({
          source: new ol.source.OSM(),
          visible: config.visible || false
        });
      } else if (config.type === 'WMS') {
        base_layer = new ol.layer.Image({
          source: new ol.source.ImageWMS({
            url: config.url,
            resolutions: config.resolutions,
            params: {
              'LAYERS': config.wms_layers.join(','),
              'FORMAT': config.format,
              'TRANSPARENT': 'false'
            },
            serverType: 'mapserver',
            //attributions: [new ol.Attribution({html: '<p></p>'})]
          }),
          extent: config.extent
        });
      }
      if (base_layer) {
        base_layer.set('type', 'baselayer');
        base_layer.set('name', config.name);
      }
      return base_layer;
    };

    MapBuilder.prototype.createProjectLayer = function(config) {
      var overlays_layer;
      if (config.layers) {
        var layers_data = this.layersTreeToList({layers: config.layers}, true);
        var visible_layers = [];
        var attributions = {};
        var layers_order = {};
        layers_data.forEach(function(layer_config) {
          //console.log(layer_config);
          if (layer_config.visible) {
            visible_layers.push(layer_config.name);
          }
          layers_order[layer_config.name] = layer_config.drawing_order;
          var attribution = layer_config.attribution;
          if (attribution) {
            var attribution_html;
            if (attribution.url) {
              attribution_html = '<a href="{0}" target="_blank">{1}</a>'.format(attribution.url, attribution.title);
            } else {
              attribution_html = attribution.title;
            }
            attributions[layer_config.name] = new ol.Attribution({html: attribution_html});
          }
        });

        if (config.mapcache_url) {
          overlays_layer = new ol.layer.Tile({
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
              visibleLayers: visible_layers,
              layersAttributions: attributions,
              layersOrder: layers_order,
              //tilePixelRatio: 1.325
            }),
            extent: config.project_extent,
          });
        } else {
          overlays_layer = new ol.layer.Image({
            source: new ol.source.WebgisImageWMS({
              url: config.ows_url,
              visibleLayers: visible_layers,
              layersAttributions: attributions,
              layersOrder: layers_order,
              params: {
                'FORMAT': 'image/png'
              },
              serverType: 'qgis'
            }),
            extent: config.project_extent,
          });
        }
        overlays_layer.set('type', 'qgislayer');
        overlays_layer.set('name', 'qgislayer');
      }
      return overlays_layer;
    };

    MapBuilder.prototype.createMap = function(config) {
      if (Object.keys(ol.proj.projections_).indexOf(config.projection.code) === -1) {
        proj4.defs(config.projection.code, config.projection.proj4);
      }

      var layers = [];
      var base_layers_configs = this.layersTreeToList({layers: config.base_layers}, true);
      base_layers_configs.forEach(function(baselayer_config) {
        var base_layer = this.createBaseLayer(baselayer_config);
        if (base_layer) {
          layers.push(base_layer);
        }
      }, this);
      var overlays_layer = this.createProjectLayer(config);
      if (overlays_layer) {
        layers.push(overlays_layer);
      }
      var map = new ol.Map({
        layers: layers,
        view: new ol.View({
          projection: new ol.proj.Projection({
            code: config.projection.code,
            units: config.units
          }),
          resolutions: config.tile_resolutions,
          extent: config.project_extent,
          //rotation: Math.PI / 6,
        }),
        controls: ol.control.defaults({
          attributionOptions: /** @type {olx.control.AttributionOptions} */ ({
            collapsible: true,
            label: '©',
          }),
          rotate: false
        }).extend([
          new ol.control.Rotate({
            label: goog.dom.createDom('span', 'icon-compass')
          })
        ]),
        renderer: 'canvas'
      });
      return map;
    };
    return new MapBuilder();
  };
})();
