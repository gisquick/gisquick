<template>
  <div
    class="image-viewer"
    :class="{'animation-active': animationActive}"
    @wheel.self.prevent="onMouseWheel"
    @mousedown="panHandler"
    @touchstart="panHandler"
    @dblclick.self="zoomIn"
  >
    <div
      class="html-layer"
      :style="overlayStyle"
    >
      <img v-if="image && !loading" :src="image.src"/>
    </div>
    <slot :viewer="this"/>
  </div>
</template>

<script lang="js">
import ImageViewer from './BaseImageViewer'

export default {
  name: 'ImageViewer',
  // mixins: [ImageViewer],
  extends: ImageViewer,
  props: {
    src: String,
  },
  data () {
    return {
      image: null,
      loading: false
    }
  },
  watch: {
    src: {
      immediate: true,
      async handler (src) {
        if (src) {
          this.loading = true
          const img = new Image()
          img.src = src
          await img.decode() // consider error handling
          this.image = Object.freeze({
            src,
            width: img.naturalWidth,
            height: img.naturalHeight
          })
          this.animationActive = false
          this.resetView()
          this.loading = false
          setTimeout(() => {
            this.animationActive = true
          }, 60)
        } else {
          this.image = null
        }
      }
    }
  }
}
</script>

<style lang="scss" scoped>
.image-viewer {
  background-color: #333;
  display: grid;
  position: relative;
  overflow: hidden;
  touch-action: none;
  user-select: none;
  .html-layer {
    grid-area: 1 / 1 / 2 / 2;
    transform-origin: 0 0;
    position: absolute;
    inset: 0;
    pointer-events: none;
    // border: 0.15em solid #fff;
    // box-sizing: content-box;
    img {
      user-select: none;
      backface-visibility: hidden;
    }
  }
  &.animation-active {
    .view, .html-layer {
      transition: 0.25s ease;
      // will-change: transform;
      will-change: font-size;
      // will-change: transform, font-size;
    }
  }
}
</style>
