 <template>
  <div class="mx-2">
    <!--layers drop box-->
    <v-select
      label="Select Time Layer"
      :items="layersSelection"
      v-model="selection"
      return-object
    />

    <vector-filter
      v-if="selection && selection.type === 'vector'"
      :input="selection.value"
    />

<!--     <raster-filter
      v-if="selection && selection.type === 'raster'"
      :input="selection.value"
    /> -->

  </div>
</template>

<script>
import ImageLayer from 'ol/layer/image'
import { WebgisImageWMS, layersList } from '../../map-builder'
import VectorFilter from './VectorFilter'


let state = null

export default {
  icon: 'time-slider',
  title: 'Time',
  inject: ['$map', '$project', '$overlays'],
  components: { VectorFilter },

  data () {
    return state || {
      selection: null
    }
  },

  computed: {
    layers () {
      return layersList(this.$project.layers, true)
    },
    layersSelection () {
      const items = this.layers
        .filter(layer => layer.time_values || layer.spatio_temporal)
        .map(layer => ({
          text: layer.title,
          value: layer,
          type: layer.time_values.length > 0 ? 'vector' : 'raster'
        }))
      const vector = items.filter(item => item.type === 'vector')
      if (vector.length > 1) {
        items.unshift({
          text: 'All visible vector layers',
          value: vector.map(item => item.value),
          type: 'vector'
        })
      }
      return items
    }
  },

  created () {
    // disable map cashing
    const map = this.$map
    if (!(map.overlay instanceof ImageLayer)) {
      // create and switch to WMS layer
      this.originalLayer = map.overlay
      this.originalLayer.setVisible(false)

      this.layer = new ImageLayer({
        visible: true,
        extent: this.$project.project_extent,
        source: new WebgisImageWMS({
          resolutions: this.$project.tile_resolutions,
          url: this.$project.ows_url,
          visibleLayers: this.originalLayer.getSource().getVisibleLayers(),
          layersAttributions: {},
          params: {
            'FORMAT': 'image/png'
          },
          serverType: 'qgis',
          ratio: 1
        })
      })

      // set as new main map's layer
      map.addLayer(this.layer)
      map.overlay = this.layer
    } else {
      this.layer = map.overlay
    }
  },

  beforeDestroy () {
    this.$map.removeLayer(this.layer)
    this.originalLayer.setVisible(true)
    this.$map.overlay = this.originalLayer
    state = this.$data
  }
}
</script>
