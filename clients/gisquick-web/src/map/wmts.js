import pickBy from 'lodash/pickBy'
import WMTSCapabilities from 'ol/format/WMTSCapabilities'
import WMTS, { optionsFromCapabilities } from 'ol/source/WMTS'
import http from '@/client'

async function wmtsConfig (url, layerConfig) {
  const { name, source } = layerConfig
  const params = {
    SERVICE: 'WMTS',
    VERSION: '1.0.0',
    REQUEST: 'GetCapabilities',
    LAYER: name
  }
  const { data } = await http.get(url, { params })
  const parsedCapabilities = new WMTSCapabilities().read(data)
  return optionsFromCapabilities(parsedCapabilities, { layer: source.layers, matrixSet: source.tileMatrixSet })
}

// convert to plain object, suitable for JSON serialization
// function saveWMTSTileGrid (tileGrid) {
//   return {
//     extent: tileGrid.getExtent(),
//     matrixIds: tileGrid.getMatrixIds(),
//     resolutions: tileGrid.getResolutions(),
//     origins: tileGrid.getMatrixIds().map(z => tileGrid.getOrigin(z)),
//     tileSizes: tileGrid.getMatrixIds().map(z => tileGrid.getTileSize(z))
//   }
// }

export async function wmtsSource (projectName, layerConfig, attributions) {
  const opts = await wmtsConfig(`/api/map/capabilities/${projectName}`, layerConfig)
  const { source } = layerConfig
  const overridingParams = pickBy({
    layer: source.layers,
    matrixSet: source.tileMatrixSet,
    format: source.format,
    style: source.styles
    // projection: layerConfig.projection
  })
  return new WMTS({ ...opts, ...overridingParams, attributions })
}
