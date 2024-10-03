
<script>
import Snap from 'ol/interaction/Snap'
import VectorSource from 'ol/source/Vector.js'
import VectorLayer from 'ol/layer/Vector.js'
import GeoJSON from 'ol/format/GeoJSON.js'
import { bbox } from 'ol/loadingstrategy.js'
import { fromExtent } from 'ol/geom/Polygon'

import { layersFeaturesQuery } from '@/map/featureinfo'

class GisquickSnap extends Snap {
  constructor (opts, tool) {
    super(opts)
    this.tool = tool
  }

  snapTo (pixel, pixelCoordinate, map) {
    const { offset } = this.tool
    if (offset) {
      pixel = [
        pixel[0] + offset.pixelOffset[0],
        pixel[1] + offset.pixelOffset[1]
      ]
      pixelCoordinate = [
        pixelCoordinate[0] + offset.offset[0],
        pixelCoordinate[1] + offset.offset[1]
      ]
    }
    const result = super.snapTo(pixel, pixelCoordinate, map)
    if (result) {
      if (offset) {
        result.vertex = [
          result.vertex[0] - offset.offset[0],
          result.vertex[1] - offset.offset[1]
        ]
        result.vertexPixel = [
          result.vertexPixel[0] - offset.pixelOffset[0],
          result.vertexPixel[1] - offset.pixelOffset[1]
        ]
      }
    }
    return result
  }
}

export default {
  props: {
    project: Object,
    layer: String,
    layers: Array,
    offset: Object,
    olStyle: [Array, Object]
  },
  created () {
    const mapProjection = this.$map.getView().getProjection().getCode()
    const source = new VectorSource({
      format: new GeoJSON(),
      loader: async (extent, resolution, projection, success, failure) => {
        const geom = fromExtent(extent)
        // const query = layerFeaturesQuery({ name: this.layer }, { geom })
        const layers = this.layers.map(name => this.project.overlays.byName[name])
        const geomFilter = { geom, projection: mapProjection }

        const propertyNames = layers.reduce((data, l) => (data[l.name] = ['geometry', l.attributes[0].name], data), {})
        const query = layersFeaturesQuery(layers, { geomFilter, propertyNames })
        const params = {
          'VERSION': '1.1.0',
          'SERVICE': 'WFS',
          'REQUEST': 'GetFeature',
          'OUTPUTFORMAT': 'GeoJSON',
          'MAXFEATURES': 200
        }
        const headers = { 'Content-Type': 'text/xml' }
        let invalidate = false
        try {
          const { data } = await this.$http.post(this.project.config.ows_url, query, { params, headers })
          const features = source.getFormat().readFeatures(data, { featureProjection: projection })
          source.addFeatures(features)
          success(features)
          if (features.length === params.MAXFEATURES) {
            this.$emit('overlimit')
            invalidate = true
          }
        } catch (err) {
          failure(err)
          this.$emit('fetcherror', err)
          invalidate = true
        }
        if (invalidate) {
          this.$map.getView().once('change:resolution', (e) => {
            source.removeLoadedExtent(extent)
          })
        }
      },
      strategy: bbox
    })
    const layer = new VectorLayer({ source, style: this.olStyle })
    const unregister = this.$map.ext.registerLayerStatusListener(layer)
    const snap = new GisquickSnap({ source }, this)
    layer.setMap(this.$map)
    this.$map.addInteraction(snap)
    const onInteractionsChange = e => {
      if (e.element !== snap) {
        this.$map.removeInteraction(snap)
        this.$map.addInteraction(snap)
      }
    }
    const interactions = this.$map.getInteractions()
    interactions.on('add', onInteractionsChange)
    this.$once('hook:beforeDestroy', () => {
      this.$map.removeInteraction(snap)
      layer.setMap(null)
      interactions.un('add', onInteractionsChange)
      unregister()
    })
    this._ol = Object.freeze({ layer, source, snap })
  },
  watch: {
    layers () {
      this._ol.source.clear()
      this._ol.source.refresh()
    }
  },
  render: () => null
}
</script>
