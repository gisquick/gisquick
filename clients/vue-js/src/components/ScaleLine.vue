<template>
  <div id="ol-scale-line-container"></div>
</template>

<script>
import ScaleLine from 'ol/control/scaleline'

export default {
  inject: ['$map'],
  mounted () {
    this.scaleLine = new ScaleLine({
      target: 'ol-scale-line-container'
    })
    this.$map.addControl(this.scaleLine)
  }
}
</script>

<style>
#ol-scale-line-container {
  position: absolute;
  xleft: 280px;
  bottom: 2em;
  width: 150px;
  height: 30px;
  overflow: visible;
}
.ol-scale-line {
  left: 0.35em;
  bottom: 0.35em;
  background-color: rgba(90, 90, 90, 0.9);
}
</style>