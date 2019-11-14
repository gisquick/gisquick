<template>
  <div
    class="scroll-container"
    @mouseenter="recalculate"
  >
    <div
      ref="trackY"
      class="scrollbar-track vertical"
    >
      <div
        class="scrollbar"
        :class="{active: activeScroll}"
        :style="scrollbarStyleY"
        @mousedown="dragStart"
      />
    </div>
    <div
      ref="scrollContent"
      class="scroll-content"
      :style="{
        paddingRight: `${scrollbarSize}px`
      }"
      @scroll="recalculate"
    >
      <div
        :class="contentWrapperClass"
        :style="{
          marginRight: `${-scrollbarSize}px`
        }"
      >
        <slot/>
      </div>
    </div>
  </div>
</template>

<script>

let scrollBarWidth = null
function getScrollBarWidth () {
  if (scrollBarWidth !== null) {
    return scrollBarWidth
  }
  const inner = document.createElement('p')
  inner.style.width = '100%'
  inner.style.height = '200px'
  const outer = document.createElement('div')
  outer.style.position = 'absolute'
  outer.style.top = 0
  outer.style.left = 0
  outer.style.visibility = 'hidden'
  outer.style.width = '200px'
  outer.style.height = '150px'
  outer.style.overflow = 'hidden'
  outer.appendChild(inner)
  document.body.appendChild(outer)
  const w1 = inner.offsetWidth
  outer.style.overflow = 'scroll'
  let w2 = inner.offsetWidth
  if (w1 === w2) {
    w2 = outer.clientWidth
  }
  document.body.removeChild(outer)
  scrollBarWidth = w1 - w2
  return scrollBarWidth
}

export default {
  props: {
    contentWrapperClass: [String, Object, Array]
  },
  data () {
    return {
      scrollbarSize: getScrollBarWidth(),
      activeScroll: false,
      scrollbarStyleY: {
        top: 0,
        height: 0
      }
    }
  },
  mounted () {
    this.recalculate()

    if (typeof MutationObserver !== 'undefined') {
      // create an observer instance
      this.mutationObserver = new MutationObserver(mutations => this.recalculate())

      this.mutationObserver.observe(
        this.$refs.scrollContent,
        // { childList: true, subtree: true }
        { attributes: true, childList: true, characterData: true, subtree: true }
      )
    }
  },
  methods: {
    recalculate () {
      // console.log('recalculate')
      if (!this.$refs.scrollContent) {
        return
      }
      const { offsetHeight, scrollHeight, scrollTop } = this.$refs.scrollContent
      const trackSize = this.$refs.trackY.offsetHeight
      const scrollbarSize = Math.round((offsetHeight / scrollHeight) * trackSize)
      const position = scrollTop / (scrollHeight - offsetHeight)

      this.scrollRatio = (scrollHeight - offsetHeight) / (trackSize - scrollbarSize)
      this.scrollbarStyleY.top = ((trackSize - scrollbarSize) * position) + 'px'
      this.scrollbarStyleY.height = scrollbarSize + 'px'
      this.scrollbarStyleY.display = scrollHeight > offsetHeight ? '' : 'none'
    },
    dragStart (evt) {
      this.dragOrigin = {
        x: evt.screenX,
        y: evt.screenY,
        scrollTop: this.$refs.scrollContent.scrollTop
      }
      this.activeScroll = true
      document.addEventListener('mousemove', this.dragMove)
      document.addEventListener('mouseup', this.dragEnd, { once: true })
      evt.preventDefault()
    },
    dragMove (evt) {
      const mouseOffset = (evt.screenY - this.dragOrigin.y) * this.scrollRatio
      this.$refs.scrollContent.scrollTop = this.dragOrigin.scrollTop + mouseOffset
    },
    dragEnd (evt) {
      this.activeScroll = false
      document.removeEventListener('mousemove', this.dragMove)
    }
  }
}
</script>

<style lang="scss" scoped>
.scroll-container {
  position: relative;
  overflow: hidden!important;
  display: flex;
}

.scrollbar-track {
  position: absolute;
  z-index: 1;
  &.vertical {
    top: 0;
    right: 0;
    bottom: 0;
    width: 11px;
  }
}

.scrollbar-track {
  .scrollbar.active {
    opacity: 0.5;
  }
}
.scroll-container:hover > .scrollbar-track.vertical {
  .scrollbar {
    opacity: 0.5;
  }
}

.scrollbar {
  position: absolute;
  right: 0;
  opacity: 0;
  width: 6px;
  min-height: 10px;
  border-radius: 3px;
  background-color: #222;
  transition: opacity 0.2s linear;
}

.scroll-content {
  overflow-x: hidden;
  overflow-y: scroll;
  box-sizing: content-box;
  min-width: 100%;
}
</style>
