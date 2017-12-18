<template>
  <div ref="mapEl" class="map">
  </div>
</template>

<script>
import { createMap } from '../map-builder'
import 'ol/ol.css'

export default {
  name: 'Map',
  props: [
    'config'
  ],
  created () {
    this.map = createMap(this.config)
    this.$root.map = this.map
  },
  mounted () {
    this.map.setTarget(this.$refs.mapEl)
  }
}
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style lang="scss">
.map {
  width: 100%;
  height: 100%;
  .ol-zoom {
    left: auto;
    right: 0.5em;
  }
}
</style>
