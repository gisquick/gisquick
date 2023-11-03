<script lang="js">
import VectorSource from 'ol/source/Vector'
import VectorLayer from 'ol/layer/Vector'
import { simpleStyle } from '@/map/styles'

export default {
  props: {
    features: Array,
    color: {
      type: Array,
      default: () => [255, 235, 59]
    }
  },
  computed: {
    style () {
      return simpleStyle({
        fill: this.color.concat(0.3),
        stroke: this.color.concat(0.9)
      })
    }
  },
  created () {
    const source = new VectorSource()
    const layer = new VectorLayer({
      source,
      style: this.style
    })
    this.$map.addLayer(layer)
    this.$watch('features', features => {
      source.clear()
      if (features) {
        source.addFeatures(features)
      }
    }, { immediate: true })
    this.$watch('style', style => layer.setStyle(style))
    this.$once('hook:beforeDestroy', () => this.$map.removeLayer(layer))
  },
  render () {
    return null
  }
}
</script>
