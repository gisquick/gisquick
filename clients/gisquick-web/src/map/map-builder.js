import Map from 'ol/Map'
import View from 'ol/View'
import ImageWMS from 'ol/source/ImageWMS'
import TileWMS from 'ol/source/TileWMS'
import TileState from 'ol/TileState'
// import BingMaps from 'ol/source/BingMaps'
import OSM from 'ol/source/OSM'
import XYZ from 'ol/source/XYZ'
import TileArcGISRest from 'ol/source/TileArcGISRest'
import ImageLayer from 'ol/layer/Image'
import TileLayer from 'ol/layer/Tile'
import LayerGroup from 'ol/layer/Group'
import TileGrid from 'ol/tilegrid/TileGrid'
import { getCenter, getBottomLeft, extend as extendExtent } from 'ol/extent'
import { get as getProj } from 'ol/proj'
import { register } from 'ol/proj/proj4'
import proj4 from 'proj4'
import { defaults as defaultControls } from 'ol/control'
import { DragRotate, defaults as defaultInteractions } from 'ol/interaction.js'
import { altKeyOnly } from 'ol/events/condition'

import { debounce, keyBy, omitBy, has } from 'lodash'
import { wmtsSource } from './wmts'

const cleanParams = params => omitBy(params, v => v === undefined || v === null || v === '')

function createUrl (baseUrl, params = {}, optParams = {}) {
  const url = new URL(baseUrl, location.origin)
  const baseParams = new Set(url.searchParams.keys())
  Object.keys(params).forEach(k => url.searchParams.set(k, params[k]))
  Object.keys(optParams).filter(n => !baseParams.has(n)).forEach(k => url.searchParams.set(k, optParams[k]))
  return url
}

function GisquickWMSType (baseClass) {
  class GisquickWMS extends baseClass {
    constructor (opts) {
      super(opts)
      this.layersOrder = opts.layersOrder || {}
      this.opacities = opts.opacities ?? {}
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
        ICONLABELSPACE: '3'
      }
      this.legendUrl = createUrl(opts.url, legendParams)
      // this.setVisibleLayers(opts.visibleLayers || [])
      this.updateOpacitiesParam = debounce(() => {
        this.updateParams({ OPACITIES: this.getLayersOpacitiesParam(this.visibleLayers) })
      }, 200)
    }

    getLayersOpacitiesParam (layers) {
      const opacities = layers.map(lname => this.opacities[lname] ?? 255)
      const setOpacities = opacities.some(o => o !== 255)
      return setOpacities ? opacities.join(',') : ''
    }

    setVisibleLayers (layers) {
      this.visibleLayers = layers.slice()
      this.updateParams({
        LAYERS: layers.join(','),
        OPACITIES: this.getLayersOpacitiesParam(layers)
      })
    }

    getVisibleLayers () {
      return this.visibleLayers
    }

    getLegendUrl (layer, view, dpi) {
      const params = {
        LAYER: layer.name,
        SCALE: Math.round(view.getScale())
      }
      if (dpi) {
        params.DPI = dpi
      }
      return createUrl(this.legendUrl, params).href
    }

    setLayerOpacity (layername, opacity) {
      this.opacities[layername] = opacity
      this.updateOpacitiesParam()
    }

    refresh () {
      // prevent caching in the browser by additional GET parameter updated on every change
      this.updateParams({ rev: this.getRevision() })
    }
  }
  return GisquickWMS
}

export const GisquickTileWMS = GisquickWMSType(TileWMS)
export const GisquickImageWMS = GisquickWMSType(ImageWMS)

function getLayerType (config) {
  const { source, type, provider_type } = config
  if (type === 'RasterLayer') {
    if (provider_type === 'wms') {
      return {
        type: source.tileMatrixSet ? 'wmst' : 'wms',
        // key: source.url + ';' + source.format
        key: source.url.split('?')[0] + ';' + source.format // base url without querystring
      }
    }
  }
  return { type: 'qgis' }
}

// splitArray(['a', 'b', 'c', 'd', 'e'], i => ['c', 'd'].includes(i)) => ['a', 'b'], ['c'], ['d'], ['e']
function splitArray (array, predicate) {
  const index = array.findIndex(predicate)
  if (index !== -1) {
    const pre = array.slice(0, index)
    const list = pre.length ? [pre] : []
    list.push([array[index]])
    return list.concat(splitArray(array.slice(index + 1), predicate))
  }
  return array.length ? [array] : []
}

export class WebgisLayerGroup extends LayerGroup {
  constructor (opts) {
    super(opts)
    this.tilesUrl = opts.tilesUrl || ''
    this.owsUrl = opts.owsUrl || ''
    this.project = opts.project || ''
    const layersConfig = keyBy(opts.layersConfig, 'name')
    this.layersOrder = opts.layersOrder || {}
    this.legendUrl = opts.legendUrl

    const orderedLayers = Object.keys(layersConfig).sort((l2, l1) => opts.layersOrder[l1] - opts.layersOrder[l2])
    const wmsLayersMap = {} // maps Gisquick -> WMS layers names
    opts.layersConfig.filter(l => l.provider_type === 'wms').forEach(l => wmsLayersMap[l.name] = l.source.layers)

    const lgroups = orderedLayers
      .map(lname => {
        const lc = layersConfig[lname]
        const { type, key } = getLayerType(lc)
        return { type, key, layers: [lc.name] }
      })
      .reduce((groups, item) => {
        const last = groups[groups.length - 1]
        if (last && last.type === item.type && last.key === item.key) {
          last.layers.push(...item.layers)
        } else {
          groups.push(item)
        }
        return groups
      }, [])

    lgroups.forEach(g => {
      const visibleLayers = g.layers.length === 1
        ? g.layers
        : g.layers.filter(lname => opts.visibleLayers.includes(lname))
      if (g.type === 'wms') {
        let extent = layersConfig[g.layers[0]].extent.slice()
        g.layers.slice(1).forEach(lname => extendExtent(extent, layersConfig[lname].extent))
        const visibleWmsLayers = visibleLayers.map(lname => wmsLayersMap[lname])
        const layerConfig = {
          source: {
            ...layersConfig[g.layers[0]].source,
            layers: visibleWmsLayers.join(',')
          },
          extent
        }
        g.ol = createWmsLayer(opts.projectConfig, layerConfig, true)
        g.ol.then(l => {
          l.set('gq-layers', g.layers)
          l.set('type', 'overlay')
          // l.set('source-type', 'wms')
        })
      } else {
        g.ol = createQgisLayer(opts.projectConfig, visibleLayers)
        g.ol.set('gq-layers', g.layers)
        g.ol.set('type', 'overlay')
        // g.ol.set('source-type', 'qgis')
      }
    })

    lgroups
      .filter(lg => lg.type === 'wms' && lg.layers.length > 1)
      .forEach(lg => {
        const opacities = lg.layers.reduce((data, name) => (data[name] = 255, data), {})

        let layersConfigKey = ''
        lg.updateLayers = () => {
          const splitFn = lname => opacities[lname] !== 255 && lg._visibleLayers?.includes(lname)
          const groups = splitArray(lg.layers, splitFn)
          const key = groups.join(';')
          if (key !== layersConfigKey) {
            // reconfigure ol layers
            layersConfigKey = key
            lg._olayers?.forEach(ol => this.getLayers().remove(ol)) // remove old layers
            if (groups.length > 1) {
              lg.ol.setVisible(false)
              lg._olayers = []
              groups.forEach(list => {
                const l = new TileLayer({
                  source: lg.ol.getSource().clone(),
                  extent: layersConfig[list[0]].extent,
                  visible: false
                })
                l.set('gq-layers', list)
                lg._olayers.push(l)
                const index = this.getLayers().getArray().findIndex(l => l === lg.ol)
                this.getLayers().insertAt(index + 1, l)
              })
            } else {
              lg._olayers = null
            }
          }
          if (groups.length > 1) {
            groups.forEach((layers, gi) => {
              const visibleLayers = layers.filter(n => lg._visibleLayers.includes(n))
              const layersParam = visibleLayers.map(n => wmsLayersMap[n]).join(',')
              const ol = lg._olayers[gi]
              if (visibleLayers.length > 0) {
                ol.getSource().updateParams({ LAYERS: layersParam })
              }
              ol.setVisible(visibleLayers.length > 0)
              if (layers.length === 1) {
                ol.setOpacity(opacities[layers[0]] / 255)
              }
            })
          } else {
            if (lg._visibleLayers.length > 0) {
              lg.ol.getSource().updateParams({
                LAYERS: lg._visibleLayers.map(n => wmsLayersMap[n]).join(',')
              })
            }
            lg.ol.setVisible(lg._visibleLayers.length > 0)
          }
        }
        lg.setVisibleLayers = layers => {
          lg._visibleLayers = layers
          lg.updateLayers()
        }
        lg.setLayerOpacity = (lname, opacity) => {
          opacities[lname] = opacity
          lg.updateLayers()
        }
      })
    const opacities = opts.opacities ?? {}
    this.source = {
      opacities,
      qgisLayer: lgroups.find(lg => lg.type === 'qgis')?.ol || createQgisLayer(opts.projectConfig, []),
      setVisibleLayers (layers) {
        const orderedLayers = layers.sort((l2, l1) => opts.layersOrder[l1] - opts.layersOrder[l2])
        lgroups.forEach(async lg => {
          if (lg.ol instanceof Promise) {
            lg.ol = await lg.ol
          }
          if (lg.layers.length === 1) {
            lg.ol.setVisible(layers.includes(lg.layers[0]))
          } else {
            const visibleLayers = orderedLayers.filter(name => lg.layers.includes(name))
            if (visibleLayers.length === 0) {
              lg.ol.setVisible(false) // not enough for splitted layers
              lg.setVisibleLayers?.(visibleLayers)
            } else {
              if (lg.type === 'qgis') {
                lg.ol.getSource().setVisibleLayers(visibleLayers)
                if (!lg.ol.getVisible()) {
                  lg.ol.setVisible(true)
                }
              } else {
                lg.setVisibleLayers(visibleLayers)
              }
            }
          }
        })
        this.visibleLayers = orderedLayers
      },
      getVisibleLayers () {
        return this.visibleLayers
      },
      getLegendUrl (layer, view, dpi) {
        const g = lgroups.find(lg => lg.layers.includes(layer.name))
        return g.ol.getSource().getLegendUrl (layer, view, dpi)
      },
      setLayerOpacity (layername, opacity) {
        this.opacities[layername] = opacity
        const lg = lgroups.find(lg => lg.layers.includes(layername))
        if (lg) {
          if (lg.layers.length > 1) {
            lg.setLayerOpacity?.(layername, opacity)
            lg.ol.getSource().setLayerOpacity?.(layername, opacity)
          } else {
            lg.ol.setOpacity(opacity / 255)
          }
        }
      },
      getFeatureInfoUrl (coordinate, resolution, projection, params) {
        return this.qgisLayer.getSource().getFeatureInfoUrl(coordinate, resolution, projection, params)
      }
    }
    Promise.all(lgroups.map(lg => lg.ol)).then((res) => {
      // intentionally not using setLayers
      res.forEach(l => this.getLayers().push(l))
    })
    this.source.setVisibleLayers(opts.visibleLayers || [])
  }

  getSource () {
    return this.source
  }
}

export function createQgisLayersGroup (config) {
  const visibleLayers = config.overlays.filter(l => l.visible).map(l => l.name)
  const layersOrder = {}

  config.overlays.forEach(layer => {
    layersOrder[layer.name] = layer.drawing_order
  })
  return new WebgisLayerGroup({
    visible: true,
    extent: config.extent,
    visibleLayers: visibleLayers,
    layersOrder: layersOrder,
    layersConfig: config.overlays,
    projectConfig: config
  })
}

export function createQgisLayer (config, layersNames) {
  if (config.mapTiling) {
    return new TileLayer({
      visible: layersNames.length > 0,
      extent: config.extent,
      source: new GisquickTileWMS({
        url: config.owsUrl,
        visibleLayers: layersNames,
        params: {
          LAYERS: layersNames.join(','),
          FORMAT: 'image/png',
          TRANSPARENT: 'true',
          TILED: 'true'
        },
        tileGrid: new TileGrid({
          origin: getBottomLeft(config.extent),
          resolutions: config.resolutions,
          tileSize: 512
        }),
        hidpi: false,
        interpolate: false
      })
    })
  } else {
    const throttle_key = `${new Date().getTime()}-${Math.random().toString(36).substring(2,7)}`
    return new ImageLayer({
      visible: layersNames.length > 0,
      extent: config.extent,
      source: new GisquickImageWMS({
        resolutions: config.resolutions,
        url: config.owsUrl,
        params: {
          LAYERS: layersNames.join(','),
          FORMAT: 'image/png',
          throttle_key
        },
        serverType: 'qgis',
        ratio: 1,
        interpolate: false,
        imageLoadFunction: (image, src) => {
          image.getImage().src = src + '&throttle_ts=' + new Date().getTime()
        }
      })
    })
  }
}

function createRetryTileLoadFunction(maxRetries = 3, retryDelay = 1000) {
  const failedTiles = {}
  window.ft = failedTiles

  return (imageTile, src) => {
    const key = imageTile.tileCoord.join('/')

    const loadImage = () => {
      // if (failedTiles[key]) {
      //   src += '?retry=' + failedTiles[key]
      // }
      imageTile.getImage().src = src
      imageTile.load()
    }

    const image = imageTile.getImage()
    image.onload = () => {
      if (has(failedTiles, key)) {
        delete failedTiles[key]
      }
      imageTile.setState(TileState.LOADED)
    }
    image.onerror = () => {
      const retries = failedTiles[key] ?? 0
      if (retries < maxRetries) {
        failedTiles[key] = retries + 1
        console.warn(`Retrying tile... attempt ${retries} for ${src}`)
        setTimeout(loadImage, retryDelay)
      } else {
        console.error(`Tile failed after ${maxRetries} retries: ${src}`)
        imageTile.setState(TileState.ERROR)
      }
    }
    // Start initial load
    loadImage()
  }
}

async function createWmsLayer (projectConfig, layerConfig, transparent = false) {
  const { source } = layerConfig

  let olSource
  if (source.tileMatrixSet) {
    // const wmts = await import(/* webpackChunkName: "wmts" */ './wmts.js')
    olSource = await wmtsSource(projectConfig.project, layerConfig, { tileLoadFunction: createRetryTileLoadFunction(2, 1000) })
  } else {
    const sourceParams = {
      url: layerConfig.source.url,
      params: cleanParams({
        LAYERS: layerConfig.source.layers,
        FORMAT: layerConfig.source.format,
        TRANSPARENT: transparent
      }),
      tileGrid: new TileGrid({
        origin: getBottomLeft(layerConfig.extent),
        resolutions: projectConfig.resolutions,
        tileSize: 512
      }),
      hidpi: false,
      tileLoadFunction: createRetryTileLoadFunction(2, 1000)
    }
    olSource = new TileWMS(sourceParams)
    olSource.clone = () => new TileWMS(sourceParams)
  }
  olSource.getLegendUrl = (layer, view, dpi) => {
    const params = {
      SERVICE: 'WMS',
      REQUEST: 'GetLegendGraphic',
      FORMAT: 'image/png',
      LAYER: layer.source.layers
      // SCALE: Math.round(view.getScale())
    }
    const optParams = {
      VERSION: '1.3.0',
      SLD_VERSION: '1.1.0'
    }
    return createUrl(layer.source.url, params, optParams).href
  }

  return new TileLayer({
    source: olSource,
    extent: layerConfig.extent
  })
}

export async function createBaseLayer (layerConfig, projectConfig, transparent = false) {
  const { source, type, provider_type } = layerConfig

  if (type === 'blank') {
    return new ImageLayer({
      extent: layerConfig.extent
    })
  }
  if (type === 'osm') {
    return new TileLayer({
      source: new OSM()
    })
  }
  if (provider_type === 'vectortile') {
    const vc = await import(/* webpackChunkName: "vectortile" */ './vector-tile.js')
    return await vc.createLayer(layerConfig)
  }
  if (type === 'xyz' || source?.type === 'xyz') {
    return new TileLayer({
      source: new XYZ({
        url: layerConfig.url
      })
    })
  }
  if (provider_type === 'arcgismapserver') {
    // for cached tiles, check https://stackoverflow.com/questions/71393178/openlayers-tilearcgisrest-vs-xyz
    const { url, ...params } = layerConfig.source
    return new TileLayer({
      source: new TileArcGISRest({
        url,
        params: Object.entries(cleanParams(params)).reduce((r, [k, v]) => (r[k.toUpperCase()] = v, r), {})
      }),
      extent: layerConfig.extent
    })
  }
  if (type === 'wms' || provider_type === 'wms') {
    return createWmsLayer(projectConfig, layerConfig, false)
  }
  /* else if (type === 'bing') {
    return new TileLayer({
      preload: Infinity,
      source: new BingMaps({
        key: layerConfig.apiKey,
        imagerySet: layerConfig.imagerySet,
        // use maxZoom 19 to see stretched tiles instead of the BingMaps "no photos at this zoom level" tiles
        maxZoom: 19
      })
    })
  } */
  // fallback to render layer by qgis server
  const throttle_key = `${new Date().getTime()}-${Math.random().toString(36).substring(2,6)}`
  return new ImageLayer({
    extent: layerConfig.extent,
    source: new GisquickImageWMS({
      resolutions: layerConfig.resolutions || projectConfig.resolutions,
      url: projectConfig.owsUrl,
      visibleLayers: [layerConfig.name],
      params: cleanParams({
        LAYERS: layerConfig.name,
        FORMAT: layerConfig.format,
        TRANSPARENT: transparent,
        throttle_key
      }),
      serverType: 'qgis',
      ratio: 1
    })
  })
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
  const projection = getProj(config.projection)
  if (!projection) {
    throw new Error(`Invalid or unknown map projection: ${config.projection}`)
  }

  const layers = []
  const overlay = createQgisLayersGroup(config)
  layers.push(overlay)

  const map = new Map({
    layers,
    view: new View({
      projection: projection,
      center: getCenter(config.extent),
      zoom: 0,
      resolutions: config.resolutions,
      constrainResolution: true,
      extent: projection.getExtent() || config.extent,
      constrainOnlyCenter: true,
      smoothExtentConstraint: false
    }),
    controls: defaultControls(controlOpts),
    interactions: defaultInteractions().extend([new DragRotate({ condition: altKeyOnly })]),
    moveTolerance: 10
  })
  map.overlay = overlay

  const baseLayers = {}
  map.getBaseLayer = async (name) => {
    if (!baseLayers[name]) {
      const layerConfig = config.baseLayers.find(c => c.name === name)
      const baseLayer = await createBaseLayer(layerConfig, config)
      baseLayer.set('type', 'baselayer')
      baseLayer.set('name', layerConfig.name)
      baseLayer.set('gq-layers', [layerConfig.name])
      map.getLayers().insertAt(0, baseLayer)
      baseLayers[name] = baseLayer
    }
    return baseLayers[name]
  }

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

export function registerProjections (projections) {
  Object.entries(projections).forEach(([code, def]) => {
    if (code && !getProj(code)) {
      proj4.defs(code, def.proj4)
    }
  })
  register(proj4)
}
