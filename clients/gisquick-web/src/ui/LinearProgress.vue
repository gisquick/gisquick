<template>
  <div
    class="linear-progress"
    :class="{indeterminate}"
    :style="barStyle"
  >
    <div class="progress" :style="progressStyle"/>
  </div>
</template>

<script>
import clamp from 'lodash/clamp'
import { colorVars } from './utils/colors'

export default {
  props: {
    color: {
      type: String,
      default: 'primary'
    },
    indeterminate: Boolean,
    min: {
      type: [Number, String],
      default: 0
    },
    max: {
      type: [Number, String],
      default: 100
    },
    value: Number,
    width: {
      type: [Number, String],
      default: 4
    }
  },
  computed: {
    range () {
      return {
        min: parseFloat(this.min),
        max: parseFloat(this.max)
      }
    },
    valueValid () {
      return Number.isFinite(this.value)
    },
    valuePos () {
      const { min, max } = this.range
      return this.valueValid ? clamp((this.value - min) / (max - min), 0, 1) : 0
    },
    barStyle () {
      return {
        height: this.width + 'px',
        borderRadius: (this.width / 2) + 'px',
        ...colorVars(this.color)
      }
    },
    progressStyle () {
      return !this.indeterminate && {
        width: `${this.valuePos * 100}%`
      }
    }
  }
}
</script>

<style lang="scss" scoped>
.linear-progress {
  display: flex;
  position: relative;
  background-color: #aaa;
  margin: 6px;
  box-shadow: 1px 1px 3px rgba(0, 0, 0, 0.12);
  .progress {
    border-radius: inherit;
    border-top-right-radius: 0;
    border-bottom-right-radius: 0;
    background-color: var(--color);
  }
  &.indeterminate {
    overflow: hidden;
    background-color: #ccc;
    .progress {
      width: 100%;
      background: linear-gradient(90deg, rgba(#ffffff, 0.1), var(--color-primary), rgba(#ffffff, 0.2));
      animation: 1.3s cubic-bezier(.25,.5,.25,0.7) infinite progress-anim;
    }
  }
}
@keyframes progress-anim {
  0% {
    transform: translate(-100%, 0) scale(0.7, 1);
  }
  100% {
    transform: translate(100%, 0) scale(1, 1);
  }
}
</style>
