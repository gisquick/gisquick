<script>
import Draw from 'ol/interaction/Draw'
import Collection from 'ol/Collection'

export default {
  props: {
    type: String,
    layout: String,
    olStyle: [Array, Object]
  },
  created () {
    let draw
    this.$watch('config', config => {
      this.$map.removeInteraction(draw)
      draw = new Draw(config)
      this.$map.addInteraction(draw)
      draw.on('drawstart', e => this.$emit('drawstart', e))
      draw.on('drawend', e => this.$emit('drawend', e))
    }, { immediate: true })
    this.$once('hook:beforeDestroy', () => this.$map.removeInteraction(draw))
  },
  computed: {
    config () {
      return {
        features: new Collection(),
        style: this.olStyle,
        type: this.type,
        geometryLayout: this.layout
      }
    }
  },
  render: () => null
}
</script>
