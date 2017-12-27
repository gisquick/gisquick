<template>
  <div class="map-container">
    <div ref="mapEl" class="map" />
    <ContentPanel :baseLayers="baseLayers" :overlays="overlays" />
  </div>
</template>

<script>
import 'ol/ol.css'

import { layersList, createMap } from '../map-builder'
import ContentPanel from './ContentPanel/ContentPanel'

export default {
  name: 'Map',
  components: { ContentPanel },
  props: [
    'project'
  ],
  provide: {
    $map: this.map
  },
  data () {
    return {
      // scale: -1,
      baseLayers: {
        tree: this.project.base_layers,
        list: layersList(this.project.base_layers, true)
      },
      overlays: {
        topics: this.project.topics,
        tree: this.project.layers,
        list: layersList(this.project.layers, true)
      }
    }
  },
  created () {
    this.map = createMap(this.project)
    this._provided.$map = this.map
  },
  mounted () {
    this.map.setTarget(this.$refs.mapEl)
  }
}
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style lang="scss">
.map-container {
  width: 100%;
  height: 100%;
  position: relative;
}
.map {
  width: 100%;
  height: 100%;
  background-color: #fff;
  .ol-zoom {
    left: auto;
    right: 0.5em;
  }
  .ol-control {
    button {
      background-color: #333;
      border-radius: 4px;
    }
  }
}
</style>
