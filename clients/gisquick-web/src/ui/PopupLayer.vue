<template>
  <portal-target
    name="popup"
    class="popup-layer"
    multiple
  />
</template>

<script lang="js">
export default {
  name: 'Popup'
}
</script>

<style lang="scss" scoped>
.popup-layer {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: auto;
  height: 100%;
  // background-color: rgba(200, 0, 0, 0.02);
  overflow: hidden;
  pointer-events: none;
  display: grid;
  z-index: 100;
}
</style>
