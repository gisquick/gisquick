<template>
  <div class="resize-container" @mousedown="resizeHandler" :style="style">
    <slot/>
    <div class="edge top"/>
    <div class="edge left"/>
    <div class="edge right"/>
    <div class="edge bottom"/>
    <div class="corner tl"/>
    <div class="corner tr"/>
    <div class="corner bl"/>
    <div class="corner br"/>
  </div>
</template>

<script>
import clamp from 'lodash/clamp'
import { eventCoord, DragHandler } from '@/events'

export default {
  props: {
    depth: {
      type: [Number, String],
      default: 1
    },
    size: {
      type: [Number, String],
      default: 8
    }
  },
  computed: {
    style () {
      return {'--resize-size': this.size + 'px'}
    }
  },
  methods: {
    resizeHandler (e) {
      const target = e.currentTarget
      const size = parseInt(this.size)

      const rect = target.getBoundingClientRect()
      const ryt = Math.abs(rect.top - e.clientY) <= size
      const ryb = Math.abs(rect.bottom - e.clientY) <= size
      const rxl = Math.abs(rect.left - e.clientX) <= size
      const rxr = Math.abs(rect.right - e.clientX) <= size
      if (!ryt && !ryb && !rxl && !rxr) {
        return
      }
      const originWidth = target.offsetWidth
      const originHeight = target.offsetHeight
      const [originX, originY] = eventCoord(e)
      let depth = parseInt(this.depth)
      let containerEl = target
      while (depth > 0) {
        containerEl = containerEl.parentElement
        depth--
      }
      let moveStarted = false
      DragHandler(e, {
        onStart: () => {},
        onMove: e => {
          if (!moveStarted) {
            containerEl.style.position = 'fixed'
            containerEl.style.top = rect.top + 'px'
            containerEl.style.left = rect.left + 'px'
            moveStarted = true
          }
          const [x, y] = eventCoord(e)
          const offsetX = clamp(x, 0, window.innerWidth) - originX
          const offsetY = clamp(y, 0, window.innerHeight) - originY
          if (ryt) {
            const height = originHeight - offsetY
            target.style.height = height + 'px'
            containerEl.style.top = rect.top + offsetY + 'px'
          }
          if (ryb) {
            const height = originHeight + offsetY
            target.style.height = height + 'px'
          }
          if (rxr) {
            const width = originWidth + offsetX
            target.style.width = width + 'px'
          }
          if (rxl) {
            const width = originWidth - offsetX
            target.style.width = width + 'px'
            containerEl.style.left = rect.left + offsetX + 'px'
          }
        },
        onEnd: () => {}
      })
    }
  }
}
</script>

<style lang="scss" scoped>
.resize-container {
  position: relative;
  overflow: visible;
}
.edge {
  position: absolute;
  z-index: 1;
  // background-color: rgba(255, 0, 0, 0.2);
  &.top {
    inset: 0 0 auto 0;
    height: var(--resize-size);
    cursor: ns-resize	;
  }
  &.bottom {
    height: var(--resize-size);
    inset: auto 0 0 0;
    cursor: ns-resize	;
  }
  &.left {
    inset: 0 auto 0 0;
    width: var(--resize-size);
    cursor: ew-resize;
  }
  &.right {
    inset: 0 0 0 auto;
    width: var(--resize-size);
    cursor: ew-resize;
  }
}
.corner {
  position: absolute;
  z-index: 1;
  width: var(--resize-size);
  height: var(--resize-size);
  &.tl {
    top: 0;
    left: 0;
    cursor: nwse-resize;
  }
  &.tr {
    top: 0;
    right: 0;
    cursor: nesw-resize;
  }
  &.br {
    bottom: 0;
    right: 0;
    cursor: nwse-resize;
  }
  &.bl {
    bottom: 0;
    left: 0;
    cursor: nesw-resize;
  }
}
</style>
