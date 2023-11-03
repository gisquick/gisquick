<template>
  <div
    class="slider"
    :disabled="disabled"
    :tabindex="disabled ? -1 : 0"
    @focus="onFocus"
    @blur="onBlur"
  >
    <label
      v-if="label"
      class="label"
      v-text="label"
    />
    <!-- <span style="position:absolute">{{ focused }}</span> -->
    <slot name="prepend" :color="markerColor"/>
    <span v-if="hideRangeLabels"/>
    <label v-else class="range min" v-text="minLabel"/>
    <div class="bar" @click="valueOnClick">
      <div ref="track" class="track" :style="barStyle"/>
      <div class="cover" :style="coverStyle"/>
      <div
        v-if="validValue"
        class="marker"
        :style="markerStyle"
        @mousedown.self="dragStart"
        @touchstart.self="dragStart"
        @click.stop=""
      >
        <!-- <v-tooltip v-if="hasTooltip">
          <slot name="tooltip"/>
        </v-tooltip> -->
      </div>
    </div>
    <span v-if="hideRangeLabels"/>
    <label v-else class="range max" v-text="maxLabel"/>
  </div>
</template>

<script lang="js">
import clamp from 'lodash/clamp'
import { blend, hexToRgb, cssColor, interpolate } from './utils/colors'
// import VTooltip from './Tooltip.vue'

const Events = {
  pointerdown: {
    move: 'pointermove',
    end: 'pointerup',
    xPos: e => e.pageX,
    yPos: e => e.pageY
  },
  mousedown: {
    move: 'mousemove',
    end: 'mouseup',
    xPos: e => e.pageX,
    yPos: e => e.pageY
  },
  touchstart: {
    move: 'touchmove',
    end: 'touchend',
    cancel: 'touchcancel',
    xPos: e => e.touches[0].pageX,
    yPos: e => e.touches[0].pageY
  }
}

export default {
  // components: { VTooltip },
  props: {
    disabled: Boolean,
    min: [String, Number],
    max: [String, Number],
    value: Number,
    hideRangeLabels: Boolean,
    colors: {
      type: Array,
      default: () => ['primary']
    },
    format: Function,
    label: String,
    lazy: Boolean,
    markerBlendColor: String
  },
  data () {
    return {
      focused: false,
      dragging: false,
      dragValue: null
    }
  },
  computed: {
    range () {
      return {
        min: parseFloat(this.min),
        max: parseFloat(this.max)
      }
    },
    minLabel () {
      return this.formatValue(this.min)
    },
    maxLabel () {
      return this.formatValue(this.max)
    },
    validValue () {
      return Number.isFinite(this.value)
    },
    valuePos () {
      const { min, max } = this.range
      const value = this.dragValue !== null ? this.dragValue : this.value
      return this.validValue ? clamp((value - min) / (max - min), 0, 1) : 0
    },
    cssColors () {
      return this.colors.map(c => c.startsWith('#') ? c : `var(--color-${c})`)
    },
    rawColors () {
      return this.colors.map(c => c.startsWith('#') ? hexToRgb(c) : `var(--color-${c}-rgb)`)
    },
    barStyle () {
      const colors = this.colors.length === 1 ? new Array(2).fill(this.cssColors[0]) : this.cssColors
      return {
        backgroundImage: `linear-gradient(to right, ${colors.join(',')})`
      }
    },
    coverStyle () {
      return {
        left: Math.round(this.valuePos * 100) + '%'
      }
    },
    markerColor () {
      if (this.colors.length === 1) {
        return {
          css: this.cssColors[0],
          raw: this.rawColors[0]
        }
      }
      const val = (this.valuePos * (this.colors.length - 1))
      const c1 = this.colors[Math.floor(val)]
      const c2 = this.colors[Math.ceil(val)]
      const weight = val - Math.floor(val)
      let rawColor = interpolate(c1, c2, weight)
      if (this.markerBlendColor) {
        rawColor = blend(this.markerBlendColor, rawColor)
      }
      return {
        css: cssColor(rawColor),
        raw: rawColor.slice(0, 3)
      }
    },
    markerStyle () {
      return {
        left: Math.round(this.valuePos * 100) + '%',
        backgroundColor: this.markerColor.css,
        '--color': this.markerColor.raw
      }
    },
    hasTooltip () {
      return !!this.$scopedSlots.tooltip
    }
  },
  methods: {
    formatValue (v) {
      return this.format ? this.format(v) : v
    },
    focus () {
      this.$el.focus()
    },
    onFocus () {
      // console.log('onFocus')
      this.focused = true
    },
    onBlur () {
      // console.log('onBlur')
      this.focused = false
    },
    dragStart (e) {
      if (!this.focused) {
        this.focus()
      }
      e.preventDefault()
      e.stopPropagation()
      const Event = Events[e.type]
      const originX = Event.xPos(e)
      const startValue = this.value

      let drag = false
      let k = 0
      const onMove = evt => {
        // console.log('slider: touch move')
        const offset = Event.xPos(evt) - originX
        if (!drag) {
          drag = true
          this.dragging = true
          // k = (this.range.max - this.range.min) / this.$refs.track.clientWidth

          const trackBounds = this.$refs.track.getBoundingClientRect()
          k = (this.range.max - this.range.min) / trackBounds.width
          // console.log('k', k)
        }
        const value = clamp(startValue + offset * k, this.range.min, this.range.max)
        this.dragValue = value
        if (!this.lazy) {
          this.$emit('input', value)
        }
      }
      const onEnd = evt => {
        // console.log('slider: touch end')
        document.removeEventListener(evt.type, onEnd, true)
        document.removeEventListener(Event.move, onMove)
        evt.stopPropagation()
        evt.preventDefault()
        const value = this.dragValue // or comupte value from coords?
        this.dragging = false
        this.dragValue = null
        if (!drag) {
          return
        }
        this.$emit('input', value)
        this.$emit('change', value)
      }
      // const onCancel = () => {
      //   console.log('slider: touch cancel')
      // }
      document.addEventListener(Event.move, onMove)
      document.addEventListener(Event.end, onEnd, true)
      if (Event.cancel) {
        // document.addEventListener(Event.cancel, onCancel)
      }
    },
    valueOnClick (e) {
      if (!this.focused) {
        this.focus()
      }
      const trackBounds = this.$refs.track.getBoundingClientRect()
      const offset = e.clientX - trackBounds.x
      const value = this.range.min + (offset / trackBounds.width) * (this.range.max - this.range.min)
      this.$emit('input', value)
      this.$emit('change', value)
    }
  }
}
</script>

<style lang="scss" scoped>
.slider {
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  margin: 6px;
  font-size: 12px;
  min-height: 36px;

  // outline-color: var(--color-primary);
  outline: 0;
  // border: 1px solid transparent;
  // border-radius: 3px;
  &:focus {
    // outline-color: var(--color-primary);
    // outline: 1px solid var(--color-primary);
    // border: 1px solid var(--color-primary);
    // box-shadow: 0 0 3pt 2pt rgba(var(--color-primary-rgb), 0.8);
  }
  label {
    &.label {
      grid-area: 1 / 1 / 2 / 4;
    }
    &.range {
      font-weight: bold;
    }
  }
  .bar {
    position: relative;
    margin: 0 12px;
    flex: 1 1;
    display: flex;
    align-items: center;
    height: 24px;
    .track {
      position: absolute;
      left: 1px;
      right: 1px;
      height: 5px;
      border-radius: 3px;
    }
    .cover {
      position: absolute;
      height: 5px;
      border-radius: 3px;
      background-color: #bbb;
      right: 0;
    }
    .marker {
      position: absolute;
      width: 20px;
      height: 20px;
      border-radius: 50%;
      border: 2px solid #fff;
      box-shadow: 0px 5px 7px rgba(0, 0, 0, 0.16);
      transform: translate(-50%, -50%);
      top: calc(50% - 1px);
      // opacity: 0.8;
      user-select: none;
      box-sizing: border-box;
      transition: .1s cubic-bezier(.25,.8,.25,1);
      transition-property: width, height;

      &:hover {
        box-shadow: 0px 5px 7px rgba(var(--color), 0.35);
        // background-color: var(--color-red)!important;
        // border-color: var(--color-primary);
        width: 22px;
        height: 22px;
        // transform: scale(1.2, 1.2);
      }
    }
  }
  &[disabled] {
    pointer-events: none;
    opacity: 0.5;
  }
}
</style>
