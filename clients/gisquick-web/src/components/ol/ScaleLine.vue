<template>
  <div class="scale-line"/>
</template>

<script>
import ScaleLine from 'ol/control/scaleline'

export default {
  mounted () {
    this.scaleLine = new ScaleLine({
      target: this.$el
    })
    this.$map.addControl(this.scaleLine)
  }
}
</script>

<style>
.scale-line {
  height: 30px;
  overflow: visible;
  position: relative;
}
.ol-scale-line {
  left: 0.35em;
  bottom: 0.35em;
  background-color: rgba(90, 90, 90, 0.9);
}
</style>
