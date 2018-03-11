<template>
  <div class="bottom-toolbar">
    <div class="logo">
      <img  src="../assets/text_logo.svg">
    </div>
    <label>Scale: 1: {{ scale }}</label>
    <label>{{ $project.projection.code }}</label>
    <label>Coordinates: <span ref="coords"></span></label>
  </div>
</template>

<script>
import MousePosition from 'ol/control/mouseposition'
import coordinate from 'ol/coordinate'

export default {
  name: 'bottom-toolbar',
  inject: ['$map', '$project'],
  data: () => ({
    scale: 1
  }),
  mounted () {
    this.updateScale()
    this.listener = this.$map.getView().on('change:resolution', this.updateScale)

    // Setup updating of mouse pointer coordinates on map (in map units)
    this.positionControl = new MousePosition({
      coordinateFormat: coordinate.createStringXY(
        this.$project.position_precision.decimal_places
      ),
      target: this.$refs.coords
    })
    this.$map.addControl(this.positionControl)
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
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  height: 32px;
  background-color: #eee;
  display: flex;
  align-items: center;
  border-top: 1px solid #aaa;
  box-shadow: 0 -1px 8px 0 rgba(0,0,0,.2), 0 -3px 3px -2px rgba(0,0,0,.12);

  .logo {
    width: 280px;
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
