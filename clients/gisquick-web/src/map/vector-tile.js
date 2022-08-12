import VectorTileLayer from 'ol/layer/VectorTile'
import VectorTileSource from 'ol/source/VectorTile'
import MVT from 'ol/format/MVT'

import { applyStyle } from 'ol-mapbox-style'


export function vectorTileLayer (layerConfig) {
  const { source } = layerConfig

  return new VectorTileLayer({
    source: new VectorTileSource({
      format: new MVT(),
      url: source.url,
      maxZoom: source.zmax ? parseInt(source.zmax) : null,
      minZoom: source.zmin ? parseInt(source.zmin) : null
    })
  })
}

export async function mapboxLayerFromURL (url) {
  const layer = new VectorTileLayer({ declutter: true })
  await applyStyle(layer, url)
  return layer
}

export async function createLayer (layerConfig) {
  const { custom } = layerConfig

  if (custom?.style_url) {
    return await mapboxLayerFromURL(custom?.style_url)
  }
  return vectorTileLayer(layerConfig)
}
