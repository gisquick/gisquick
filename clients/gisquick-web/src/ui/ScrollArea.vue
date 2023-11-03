<template>
  <div
    class="scroll-container"
    @mouseenter="recalculate"
  >
    <div
      ref="scrollContent"
      class="scroll-content"
      :class="contentClass"
      :style="containerStyle"
      @scroll="recalculate"
      v-on="$listeners"
    >
      <slot/>
    </div>

    <div
      ref="trackY"
      class="scrollbar-track vertical"
      :style="trackStyleY"
    >
      <div
        class="scrollbar"
        :class="{active: activeScroll}"
        :style="scrollbarStyleY"
        @mousedown="verticalDrag"
      />
    </div>
    <div
      ref="trackX"
      class="scrollbar-track horizontal"
      :style="trackStyleX"
    >
      <div
        class="scrollbar"
        :class="{active: activeScroll}"
        :style="scrollbarStyleX"
        @mousedown="horizontalDrag"
      />
    </div>
  </div>
</template>

<script lang="js">
import debounce from 'lodash/debounce'
import { DragHandler, eventCoord } from '@/events'

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
    contentClass: [String, Object, Array]
  },
  data () {
    return {
      scrollbarSize: getScrollBarWidth(),
      activeScroll: false,
      scrollbarStyleY: {
        top: 0,
        height: 0
      },
      scrollbarStyleX: {
        left: 0,
        width: 0
      },
      trackStyleX: {
        display: 'none'
      },
      trackStyleY: {
        display: 'none'
      }
    }
  },
  computed: {
    containerStyle () {
      return {
        marginBottom: `-${this.scrollbarSize}px`,
        marginRight: `-${this.scrollbarSize}px`
      }
      // flexbox version
      // const size = `calc(100% + ${this.scrollbarSize}px)`
      // return {
      //   minWidth: size,
      //   maxWidth: size,
      //   minHeight: size,
      //   maxHeight: size
      // }
    }
  },
  mounted () {
    // const { clientHeight, offsetHeight } = this.$refs.scrollContent
    // const scrollbarSize = offsetHeight - clientHeight
    // console.log('scrollbarSize', scrollbarSize, this.$el)

    if (typeof ResizeObserver !== 'undefined') {
      let observer = new ResizeObserver(debounce(this.recalculate, 150))
      observer.observe(this.$refs.scrollContent)
      this.$once('hook:beforeDestroy', () => {
        observer.disconnect()
        observer = null
      })
    }
  },
  methods: {
    recalculate () {
      if (!this.$refs.scrollContent) {
        return
      }
      const { clientHeight, scrollHeight, scrollTop } = this.$refs.scrollContent
      const trackSizeY = this.$refs.trackY.offsetHeight
      const scrollbarSizeY = Math.round((clientHeight / scrollHeight) * trackSizeY)
      const positionY = scrollTop / (scrollHeight - clientHeight)

      this.scrollRatioY = (scrollHeight - clientHeight) / (trackSizeY - scrollbarSizeY)
      this.scrollbarStyleY.top = ((trackSizeY - scrollbarSizeY) * positionY) + 'px'
      this.scrollbarStyleY.height = scrollbarSizeY + 'px'
      this.trackStyleY.display = scrollHeight > clientHeight ? '' : 'none'

      // horizontal
      const { clientWidth, scrollWidth, scrollLeft } = this.$refs.scrollContent
      const trackSizeX = this.$refs.trackX.offsetWidth
      const scrollbarSizeX = Math.round((clientWidth / scrollWidth) * trackSizeX)
      const positionX = scrollLeft / (scrollWidth - clientWidth)

      this.scrollRatioX = (scrollWidth - clientWidth) / (trackSizeX - scrollbarSizeX)
      this.scrollbarStyleX.left = ((trackSizeX - scrollbarSizeX) * positionX) + 'px'
      this.scrollbarStyleX.width = scrollbarSizeX + 'px'
      this.trackStyleX.display = scrollWidth > clientWidth ? '' : 'none'
    },
    dragHandler (evt, coordIndex, scrollAttr, scrollRatio) {
      const origin = {
        pos: eventCoord(evt),
        scrollStart: this.$refs.scrollContent[scrollAttr]
      }
      this.activeScroll = true
      DragHandler(evt, {
        onMove: e => {
          const offset = (eventCoord(e)[coordIndex] - origin.pos[coordIndex]) * scrollRatio
          this.$refs.scrollContent[scrollAttr] = origin.scrollStart + offset
        },
        onEnd: () => {
          this.activeScroll = false
        }
      })
    },
    horizontalDrag (evt) {
      this.dragHandler(evt, 0, 'scrollLeft', this.scrollRatioX)
    },
    verticalDrag (evt) {
      this.dragHandler(evt, 1, 'scrollTop', this.scrollRatioY)
    }
  }
}
</script>

<style lang="scss" scoped>
.scroll-container {
  position: relative;
  overflow: hidden!important;

  // min-height: 0;
  // display: flex;
  // flex-direction: column;
  // max-height: 100%;

  display: grid;
  max-height: 100%;
  grid-template-rows: minmax(0, 100%);
  // min-height: 0;
  // height: 100%;
  scrollbar-color: transparent transparent; // hide native scrollbar in Firefox
}

.scrollbar-track {
  position: absolute;
  z-index: 1;
  &.vertical {
    top: 0;
    right: 0;
    bottom: 0;
    width: 12px;
    .scrollbar {
      min-height: 10px;
      right: 0;
      width: 6px;
    }
  }
  &.horizontal {
    left: 0;
    right: 0;
    bottom: 0;
    height: 11px;
    .scrollbar {
      min-width: 10px;
      bottom: 0;
      height: 6px;
    }
  }
}

.scrollbar-track {
  .scrollbar.active {
    opacity: 0.5;
  }
}
.scroll-container:hover > .scrollbar-track {
  .scrollbar {
    opacity: 0.5;
  }
}

.scrollbar {
  position: absolute;
  opacity: 0;
  border-radius: 3px;
  background-color: #222;
  transition: opacity 0.2s linear;
  user-select: none;
}

.scroll-content {
  overflow-x: scroll;
  overflow-y: scroll;
  min-width: 100%;
  min-height: 100%;
}
</style>
