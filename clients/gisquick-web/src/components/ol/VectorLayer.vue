<script lang="js">
import VectorSource from 'ol/source/Vector'
import VectorLayer from 'ol/layer/Vector'
import Collection from 'ol/Collection'

import { updateLock, ShallowArray } from '@/utils'

export default {
  props: {
    features: Array,
    fill: [Array, String],
    stroke: [Array, String],
    olStyle: [Array, Object],
    zIndex: {
      type: Number,
      default: 0
    },
    overlay: Boolean
  },
  created () {
    const source = new VectorSource({ features: new Collection(ShallowArray()) })
    const layer = new VectorLayer({
      source,
      zIndex: this.zIndex
    })
    if (this.overlay) {
      layer.setMap(this.$map)
      this.$once('hook:beforeDestroy', () => layer.setMap(null))
    } else {
      this.$map.addLayer(layer)
      this.$once('hook:beforeDestroy', () => this.$map.removeLayer(layer))
    }
    this.$emit('update:layer', layer)
    this.$once('hook:beforeDestroy', () => this.$emit('update:layer', null))

    const { eventHandler, updateHandler } = updateLock()
    this.$watch('olStyle', style => layer.setStyle(style), { immediate: true })
    this.$watch('features', updateHandler((features, oldFeatures) => {
      source.clear()
      source.addFeatures(features)
    }), { immediate: true })

    // source.on('addfeature', eventHandler(e => {
    //   this.$emit('update:features', ShallowArray(source.getFeatures()))
    // }))
    // source.on('clear', eventHandler(e => {
    //   this.$emit('update:features', updateValue(ShallowArray()))
    // }))
  },
  render: () => null
}
</script>
