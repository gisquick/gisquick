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
      radius: 5
    })
  })
}
const defaultStyle = createStyle([255, 235, 59])

export default {
  props: {
    features: Array
  },
  created () {
    const source = new VectorSource()
    const layer = new VectorLayer({
      source,
      style: defaultStyle
    })
    layer.setMap(this.$map)
    this.layer = layer
    this.source = source
    this.setFeatures(this.features)
  },
  watch: {
    features: 'setFeatures'
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
