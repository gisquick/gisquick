<template>
  <div class="bottom-toolbar">
    <div class="logo">
      <img :src="logo"/>
    </div>
    <label><translate>Scale</translate> 1: {{ scale }}</label>
    <label>{{ project.config.projection }}</label>
    <label>
      <translate>Coordinates</translate>: <span ref="coords"></span>
    </label>
  </div>
</template>

<script lang="js">
import { mapState } from 'vuex'
import { unByKey } from 'ol/Observable'
import { createStringXY } from 'ol/coordinate'
import MousePosition from 'ol/control/MousePosition'
import defaultTextLogo from '../assets/text_logo.svg?url'

export default {
  name: 'bottom-toolbar',
  data: () => ({
    scale: 1
  }),
  computed: {
    ...mapState(['project']),
    logo () {
      return this.project.config.app?.text_logo || defaultTextLogo
    }
  },
  mounted () {
    this.updateScale()
    this.listener = this.$map.getView().on('change:resolution', this.updateScale)

    const precision = this.project.config.position_precision
      ? this.project.config.position_precision.decimal_places // old API
      : this.project.config.units.position_precision // new API

    // Setup updating of mouse pointer coordinates on map (in map units)
    this.positionControl = new MousePosition({
      coordinateFormat: createStringXY(precision ?? 2),
      target: this.$refs.coords
    })
    this.$map.addControl(this.positionControl)
  },
  beforeDestroy () {
    unByKey(this.listener)
  },
  methods: {
    updateScale () {
      const scale = this.$map.getView().getScale()
      if (scale) { // filters empty values during zoom animation
        this.scale = scale
      }
    }
  }
}
</script>

<style lang="scss">
.bottom-toolbar {
  height: 32px;
  background-color: #eee;
  display: flex;
  align-items: center;
  border-top: 1px solid #aaa;
  box-shadow: 0 -1px 8px 0 rgba(0,0,0,.2), 0 -3px 3px -2px rgba(0,0,0,.12);

  .logo {
    width: 288px;
    text-align: center;
    height: inherit;
    padding: 4px 0;
    border-right: 1px solid #aaa;
    img {
      height: 100%;
      object-fit: contain;
    }
  }
  label {
    font-size: 0.813em;
    margin: 0 8px;
  }
  .ol-mouse-position {
    position: static;
    display: inline;
  }
}
</style>
