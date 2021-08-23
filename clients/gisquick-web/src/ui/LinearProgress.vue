<template>
  <div class="linear-progress" :style="barStyle">
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
    min: {
      type: Number,
      default: 0
    },
    max: {
      type: Number,
      default: 100
    },
    value: Number,
    width: {
      type: Number,
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
      return {
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
  // overflow: hidden;
  box-shadow: 1px 1px 3px rgba(0, 0, 0, 0.12);
  .progress {
    border-radius: inherit;
    border-top-right-radius: 0;
    border-bottom-right-radius: 0;
    background-color: var(--color);
  }
}
</style>
