<template>
  <div class="map-control f-col dark">
    <v-btn
      class="zoom-in icon"
      @click="zoomIn"
    >
      <v-icon name="plus"/>
    </v-btn>
    <v-btn
      class="zoom-out icon"
      @click="zoomOut"
    >
      <v-icon name="minus"/>
    </v-btn>
    <v-btn
      class="icon"
      @click="zoomToMax"
    >
      <v-icon name="zoom-max"/>
    </v-btn>
  </div>
</template>

<script>
import { mapState } from 'vuex'
import ZoomControl from 'ol/control/zoom'

export default {
  name: 'map-control',
  computed: {
    ...mapState(['project'])
  },
  created () {
    this.zoom = Object.create(ZoomControl.prototype)
    Object.assign(this.zoom, {
      duration_: 250,
      getMap: () => this.$map
    })
  },
  methods: {
    zoomIn (evt) {
      this.zoom.handleClick_(1, evt)
    },
    zoomOut (evt) {
      this.zoom.handleClick_(-1, evt)
    },
    zoomToMax () {
      const extent = this.project.config.project_extent
      const padding = this.$map.ext.visibleAreaPadding()
      this.$map.getView().fit(extent, { duration: 400, padding })
    }
  }
}
</script>

<style lang="scss" scoped>
.map-control {
  .btn {
    background-color: var(--color-dark);
    width: 32px;
    height: 32px;
    margin: 2px;
    border-radius: 6px;
    opacity: 0.9;
    &.zoom-in {
      border-bottom-left-radius: 2px;
      border-bottom-right-radius: 2px;
      margin-bottom: 1px;
    }
    &.zoom-out {
      border-top-left-radius: 2px;
      border-top-right-radius: 2px;
      margin-top: 0;
    }
  }
}
</style>
