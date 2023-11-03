<template>
  <popup-content
    :interactive="false"
    :transition="transition"
    :open="open"
    :bounds="bounds || pBounds"
    :align="align"
    arrow-style
    :popup-class="contentClasses"
    :popup-style="popupStyle"
    origin="tooltip"
  >
    <div
      class="popup-content tooltip-box"
      @mouseenter="onTooltipEnter"
      @mouseleave="onTooltipLeave"
    >
      <slot v-if="open"/>
    </div>
  </popup-content>
</template>

<script lang="js">
import debounce from 'lodash/debounce'
import PopupContent from './PopupContent.vue'
import { elementBounds } from './utils/popup'
import { colorVar } from './utils/colors'

export default {
  components: { PopupContent },
  props: {
    align: {
      type: String,
      default: 'c,ll,rr;bb,tt'
    },
    bounds: Object,
    color: String,
    contentClass: {
      type: String,
      default: 'tooltip'
    },
    hoverDelay: {
      type: [Number, String],
      default: 700
    },
    interactive: {
      type: Boolean,
      default: true
    },
    manualMode: Boolean,
    transition: {
      type: [String, Object],
      default: 'slide-y'
    },
    value: {
      type: Boolean,
      default: undefined
    }
  },
  data () {
    return {
      pBounds: null,
      open: false,
      overTooltip: false
    }
  },
  computed: {
    colorStyle () {
      return this.color && colorVar(this.color)
    },
    popupStyle () {
      return {
        ...this.colorStyle,
        pointerEvents: this.interactive ? undefined : 'none'
      }
    },
    contentClasses () {
      if (this.color) {
        return [this.contentClass, 'colored']
      }
      return this.contentClass
    }
  },
  watch: {
    value (visible) {
      visible ? this.show() : this.hide()
    }
  },
  mounted () {
    let timer
    const setTooltipState = debounce(visible => {
      if (!visible && this.overTooltip) {
        // don't close when mouse moved over tooltip
        return
      }
      if (this.value === undefined) {
        if (visible && this.hoverDelay) {
          timer = setTimeout(() => this.show(this._anchor), this.hoverDelay)
        } else {
          if (timer) {
            clearTimeout(timer)
            timer = null
          }
          visible ? this.show(this._anchor) : this.hide()
        }
      }
    }, 200)
    this._stateHandler = setTooltipState

    if (!this.manualMode) {
      const target = this.$el.parentElement
      const showTooltip = () => {
        this._anchor = target
        setTooltipState(true)
      }
      const hideTooltip = () => {
        this._anchor = target
        setTooltipState(false)
      }

      target.addEventListener('mouseenter', showTooltip)
      target.addEventListener('mouseleave', hideTooltip)
      target.addEventListener('mousedown', hideTooltip)
      this.$once('hook:beforeDestroy', () => {
        target.removeEventListener('mouseenter', showTooltip)
        target.removeEventListener('mouseleave', hideTooltip)
        target.removeEventListener('mousedown', hideTooltip)
        this.open = false
      })
    }
  },
  methods: {
    show (target) {
      this.pBounds = this.bounds || elementBounds(target || this.$el.parentElement)
      this.open = true
    },
    hide () {
      this.open = false
      this.overTooltip = false
    },
    onTooltipEnter () {
      this.overTooltip = true
    },
    onTooltipLeave () {
      this.value === undefined && this.hide()
    },
    onTargetEnter (target) {
      if (this._stateHandler) {
        this._anchor = target
        this._stateHandler(true)
      }
    },
    onTargetLeave () {
      this._stateHandler?.(false)
    }
  }
}
</script>

<style lang="scss" scoped>
.tooltip-box {
  display: flex;
  padding: 4px;
  position: relative;
  border-radius: 3px;
  white-space: pre-line;
  background-color: var(--tooltip-bg);
  color: var(--tooltip-color);
}
</style>

<style lang="scss">
.tooltip {
  &.slide-y-enter-active, &.fade-enter-active {
    pointer-events: none;
  }
  .anchor {
    svg {
      width: 16px;
      height: 8px;
    }
  }
  &.colored {
    .tooltip-box {
      border: 1px solid var(--color);
    }
    .anchor {
      path {
        stroke: var(--color);
        stroke-width: 1;
        vector-effect: non-scaling-stroke;
      }
    }
  }
}
</style>
