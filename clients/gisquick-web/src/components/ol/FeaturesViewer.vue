<script>
import VectorSource from 'ol/source/Vector'
import VectorLayer from 'ol/layer/Vector'
import { simpleStyle } from '@/map/styles'

export default {
  props: {
    features: Array,
    selectedIndex: Number,
    selected: Object, // Feature objecct
    color: {
      type: Array,
      default: () => [255, 235, 59]
    },
    selectedColor: {
      type: Array,
      default: () => [3, 169, 244]
    },
    className: String
  },
  computed: {
    style () {
      return simpleStyle({
        fill: this.color.concat(0.3),
        stroke: this.color.concat(0.9)
      })
    },
    selectedStyle () {
      return simpleStyle({
        fill: [...this.selectedColor, 0.4],
        stroke: [...this.selectedColor, 0.9],
        strokeWidth: 3
      })
    },
    selectedFeature () {
      return this.selected || this.features?.[this.selectedIndex]
    }
  },
  created () {
    const source = new VectorSource()
    const layer = new VectorLayer({
      source,
      style: this.style,
      className: this.className
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
  watch: {
    selectedFeature (feature, oldFeature) {
      if (oldFeature) {
        oldFeature.setStyle(null)
      }
      if (feature) {
        feature.setStyle(this.selectedStyle)
      }
    }
  },
  render () {
    return null
  }
}
</script>
