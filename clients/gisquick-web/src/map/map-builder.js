import Map from 'ol/map'
import View from 'ol/view'
import ImageWMS from 'ol/source/imagewms'
import TileImage from 'ol/source/tileimage'
import OSM from 'ol/source/osm'
import ImageLayer from 'ol/layer/image'
import TileLayer from 'ol/layer/tile'
import TileGrid from 'ol/tilegrid/tilegrid'
import Extent from 'ol/extent'
import proj from 'ol/proj'
import proj4 from 'proj4'
import Attribution from 'ol/attribution'
import Control from 'ol/control'
import md5 from 'md5'

function createUrl (baseUrl, params = {}) {
  const url = new URL(baseUrl, location.origin)
  Object.keys(params).forEach(k => url.searchParams.append(k, params[k]))
  return url
}

export class WebgisImageWMS extends ImageWMS {
  constructor (opts) {
    super(opts)
    this.layersAttributions = opts.layersAttributions || {}
    this.layersOrder = opts.layersOrder || {}
    const legendParams = {
      SERVICE: 'WMS',
      VERSION: '1.1.1',
      REQUEST: 'GetLegendGraphic',
      EXCEPTIONS: 'application/vnd.ogc.se_xml',
      FORMAT: 'image/png',
      SYMBOLHEIGHT: '4',
      SYMBOLWIDTH: '6',
      LAYERFONTSIZE: '10',
      LAYERFONTBOLD: 'true',
      ITEMFONTSIZE: '11',
      ICONLABELSPACE: '6'
    }
    this.legendUrl = createUrl(opts.url, legendParams)
    this.setVisibleLayers(opts.visibleLayers || [])
  }

  setVisibleLayers (layers) {
    const orderedLayers = [].concat(layers)
    orderedLayers.sort((l2, l1) => this.layersOrder[l1] - this.layersOrder[l2])

    // update attributions
    if (this.layersAttributions) {
      const attributions = []
      const htmlAttributions = []
      orderedLayers.forEach(layername => {
        const attribution = this.layersAttributions[layername]
        if (attribution && htmlAttributions.indexOf(attribution.getHTML()) === -1) {
          attributions.push(attribution)
          htmlAttributions.push(attribution.getHTML())
        }
      })
      this.setAttributions(attributions)
    }
    this.updateParams({ LAYERS: orderedLayers.join(',') })
    this.visibleLayers = orderedLayers
  }

  getVisibleLayers () {
    return this.visibleLayers
  }

  getLegendUrl (layername, view) {
    this.legendUrl.searchParams.set('LAYER', layername)
    this.legendUrl.searchParams.set('SCALE', Math.round(view.getScale()))
    return this.legendUrl.href
  }
}

export class WebgisTileImage extends TileImage {
  constructor (opts) {
    super(opts)
    this.tilesUrl = opts.tilesUrl || ''
    this.owsUrl = opts.owsUrl || ''
    this.project = opts.project || ''
    this.layersAttributions = opts.layersAttributions || {}
    this.layersOrder = opts.layersOrder || {}
    this.tileUrlFunction = this._tileUrlFunction
    this.legendUrl = opts.legendUrl
    this.setVisibleLayers(opts.visibleLayers || [])
  }

  _tileUrlFunction (tileCoord, pixelRatio, projection) {
    if (this.visibleLayers.length === 0) {
      return ''
    }
    const [z, x, y] = tileCoord
    return this.tileUrlTemplate
      .replace('{z}', z)
      .replace('{x}', x)
      .replace('{y}', y)
  }

  setVisibleLayers (layers) {
    const orderedLayers = [].concat(layers)
    orderedLayers.sort((l2, l1) => this.layersOrder[l1] - this.layersOrder[l2])
    this.visibleLayers = orderedLayers
    const layersNames = orderedLayers.join(',')
    this.tileUrlTemplate = `${this.tilesUrl}${md5(layersNames)}/{z}/{x}/{y}.png?PROJECT=${this.project}&LAYERS=${layersNames}`
    this.tileCache.clear()

    // update attributions
    if (this.layersAttributions) {
      const attributions = []
      const htmlAttributions = []
      orderedLayers.forEach(layername => {
        const attribution = this.layersAttributions[layername]
        if (attribution && htmlAttributions.indexOf(attribution.getHTML()) === -1) {
          attributions.push(attribution)
          htmlAttributions.push(attribution.getHTML())
        }
      })
      this.setAttributions(attributions)
    }
    this.changed()
  }

  /**
   * Returns list of visible layers (names)
   * @return {Array<String>}
   */
  getVisibleLayers () {
    return this.visibleLayers
  }

  getLegendUrl (layername, view) {
    var zoomLevel = this.getTileGrid().getZForResolution(view.getResolution())

    const baseUrl = `${this.legendUrl}${md5(layername)}/${zoomLevel}.png`
    const params = {
      SERVICE: 'WMS',
      VERSION: '1.1.1',
      REQUEST: 'GetLegendGraphic',
      EXCEPTIONS: 'application/vnd.ogc.se_xml',
      FORMAT: 'image/png',
      SYMBOLHEIGHT: 4,
      SYMBOLWIDTH: 6,
      LAYERFONTSIZE: 10,
      LAYERFONTBOLD: 'true',
      ITEMFONTSIZE: 11,
      ICONLABELSPACE: 6,
      PROJECT: this.project,
      LAYER: layername,
      SCALE: Math.round(view.getScale())
    }
    return createUrl(baseUrl, params).href
  }
}

function createAttribution (config) {
  const html = config.url
    ? `<a href="${config.url}" target="_blank">${config.title}</a>`
    : config.title
  return new Attribution({ html })
}
export function createQgisLayer (config) {
  const visibleLayers = config.overlays.filter(l => l.visible).map(l => l.name)
  const layersOrder = {}
  const attributions = {}

  config.overlays.forEach(layer => {
    layersOrder[layer.name] = layer.drawing_order
    if (layer.attribution) {
      attributions[layer.name] = createAttribution(layer.attribution)
    }
  })

  if (config.mapcacheUrl) {
    return new TileLayer({
      visible: true,
      extent: config.extent,
      source: new WebgisTileImage({
        project: config.project,
        tilesUrl: config.mapcacheUrl,
        legendUrl: config.legendUrl,
        owsUrl: config.owsUrl,
        projection: config.projection.code,
        tileGrid: new TileGrid({
          origin: Extent.getBottomLeft(config.extent),
          resolutions: config.resolutions,
          tileSize: 256
        }),
        visibleLayers: visibleLayers,
        layersAttributions: attributions,
        layersOrder: layersOrder
      })
    })
  } else {
    return new ImageLayer({
      visible: true,
      extent: config.extent,
      source: new WebgisImageWMS({
        resolutions: config.resolutions,
        url: config.owsUrl,
        visibleLayers: visibleLayers,
        layersAttributions: attributions,
        layersOrder: layersOrder,
        params: {
          FORMAT: 'image/png'
        },
        serverType: 'qgis',
        ratio: 1
      })
    })
  }
}

export function createBaseLayer (layerConfig, projectConfig = {}) {
  switch (layerConfig.type) {
    case 'blank': {
      return new ImageLayer({
        extent: layerConfig.extent,
        visible: layerConfig.visible
      })
    }
    case 'osm': {
      return new TileLayer({
        source: new OSM(),
        visible: layerConfig.visible
      })
    }
    case 'wms': {
      return new ImageLayer({
        source: new ImageWMS({
          url: layerConfig.url,
          resolutions: layerConfig.resolutions,
          params: {
            LAYERS: layerConfig.wms_layers.join(','),
            FORMAT: layerConfig.format,
            TRANSPARENT: 'false'
          },
          attributions: layerConfig.attribution ? [createAttribution(layerConfig.attribution)] : null,
          serverType: 'mapserver',
          ratio: 1.0
        }),
        extent: layerConfig.extent,
        visible: layerConfig.visible
      })
    }
    // fallback to render layer by qgis server
    case 'raster': {
      return new ImageLayer({
        visible: layerConfig.visible,
        extent: layerConfig.extent,
        source: new WebgisImageWMS({
          resolutions: layerConfig.resolutions || projectConfig.resolutions,
          url: projectConfig.owsUrl,
          visibleLayers: [layerConfig.name],
          layersAttributions: layerConfig.attributions,
          params: {
            LAYERS: layerConfig.name,
            FORMAT: layerConfig.format,
            TRANSPARENT: 'false'
          },
          serverType: 'qgis',
          ratio: 1
        })
      })
    }
  }
}

const handleMapBrowserEvent = Map.prototype.handleMapBrowserEvent
/* eslint no-extend-native: ["error", { "exceptions": ["Map"] }] */
Map.prototype.handleMapBrowserEvent = function (evt) {
  if (this.transformBrowserEvent) {
    this.transformBrowserEvent(evt)
  }
  return handleMapBrowserEvent.call(this, evt)
}

/**
 * @param {Object} config
 * @param {Array<Object>} config.baseLayers base layers
 * @param {Array<Object>} config.overlays overlay layers
 * @param {Object} config.projection as { code, proj4 }
 * @param {Array<number>} config.extent map extent
 * @param {Array<number>} config.resolutions map tile resolutions
 * @param {Array<number>} config.scales map scales
 * @param {String} config.owsUrl mapserver url
 * @param {String} config.legendUrl legend url
 * @param {String} config.mapcacheUrl mapcache url for cached overlays
 * @param {String} config.project ows project name
 * @param {Object} controlOpts ol control options
 */
export function createMap (config, controlOpts = {}) {
  let projection = proj.get(config.projection.code)
  if (!projection) {
    proj.setProj4(proj4)
    proj4.defs(config.projection.code, config.projection.proj4)
    projection = proj.get(config.projection.code)
  }

  const layers = []
  const overlay = createQgisLayer(config)
  if (config.baseLayers) {
    config.baseLayers.forEach(baseLayerCfg => {
      const baseLayer = createBaseLayer(baseLayerCfg, config)
      baseLayer.set('name', baseLayerCfg.name)
      baseLayer.set('type', 'baselayer')
      layers.push(baseLayer)
    })
  }
  layers.push(overlay)

  const map = new Map({
    layers,
    view: new View({
      projection: projection,
      center: Extent.getCenter(config.extent),
      zoom: 0,
      resolutions: config.resolutions,
      extent: projection.getExtent() || config.extent
    }),
    controls: Control.defaults(controlOpts)
  })
  map.overlay = overlay

  // define getScale method for map's view object
  // (using scales from project metadata)
  const resolutionsToScales = {}
  config.resolutions.forEach((res, index) => {
    resolutionsToScales[res] = config.scales[index]
  })
  map.getView().getScale = function () {
    return resolutionsToScales[this.getResolution()]
  }

  return map
}
