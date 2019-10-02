<script>
import VectorSource from 'ol/source/vector'
import VectorLayer from 'ol/layer/vector'
import Style from 'ol/style/style'
import Fill from 'ol/style/fill'
import Stroke from 'ol/style/stroke'
import Circle from 'ol/style/circle'

export function createStyle (color) {
  return new Style({
    stroke: new Stroke({
      color: color.concat(0.8),
      width: 2
    }),
    fill: new Fill({
      color: color.concat(0.5)
    }),
    image: new Circle({
      stroke: new Stroke({
        color: color.concat(0.8),
        width: 2
      }),
      fill: new Fill({
        color: color.concat(0.5)
      }),
      radius: 8
    })
  })
}

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
      return createStyle(this.color)
    }
  },
  created () {
    const source = new VectorSource()
    const layer = new VectorLayer({
      source,
      style: this.style
    })
    layer.setMap(this.$map)
    this.layer = layer
    this.source = source
    this.setFeatures(this.features)
  },
  watch: {
    features: 'setFeatures',
    style (style) {
      this.layer.setStyle(style)
    }
  },
  beforeDestroy () {
    this.layer.setMap(null)
  },
  methods: {
    setFeatures (features) {
      this.source.clear()
      if (features) {
        this.source.addFeatures(features)
      }
    }
  },
  render () {
    return null
  }
}
</script>
