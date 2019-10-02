<script>
import Overlay from 'ol/overlay'
import Marker from '@/assets/identification-marker.svg'

export default {
  props: {
    coords: Array
  },
  created () {
    const map = this.$map
    const img = new Image()
    img.src = Marker
    this.overlay = new Overlay({
      element: img,
      positioning: 'center-center'
    })
    this.updatePosition(this.coords)
    this.overlay.setMap(map)
  },
  watch: {
    coords: 'updatePosition'
  },
  beforeDestroy () {
    this.overlay.setMap(null)
  },
  methods: {
    updatePosition (coords) {
      this.overlay.setPosition(coords)
    }
  },
  render () {
    return null
  }
}
</script>
