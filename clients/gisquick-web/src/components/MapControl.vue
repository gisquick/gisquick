<template>
  <v-layout class="map-control column">
    <v-btn
      icon
      class="zoom-in"
      @click="zoomIn"
    >
      <v-icon>add</v-icon>
    </v-btn>
    <v-btn
      icon
      class="zoom-out"
      @click="zoomOut"
    >
      <v-icon>remove</v-icon>
    </v-btn>
    <v-btn icon @click="zoomToMax">
      <icon name="zoom-max"/>
    </v-btn>
  </v-layout>
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
@import '../theme';

.map-control {
  .v-btn {
    font-size: 1em;
    background-color: $dark-color;
    margin: 2px;
    color: white;
    width: 2em;
    height: 2em;
    border-radius: 20%;
    opacity: 0.85;
    .icon {
      width: 1.25em;
      height: 1.25em;
      fill: white;
    }
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
