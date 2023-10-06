<template>
  <div
    class="radio-button"
    :class="{focused, selected}"
    :disabled="disabled"
    :aria-disabled="disabled"
    :aria-label="label"
    :style="colorVars"
    :tabindex="disabled ? -1 : 0"
    @focus="focused = !disabled"
    @blur="focused = false"
    @click="select"
    @keydown.space.prevent="select"
  >
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="22"
      height="22"
      viewBox="0 0 22 22"
      class="radio"
    >
      <circle
        cx="11"
        cy="11"
        r="10"
        class="outline"
      />
      <circle
        cx="11"
        cy="11"
        r="5"
        class="fill"
      />
    </svg>
    <slot>
      <span class="label f-grow" v-text="label"/>
    </slot>
    <slot name="append"/>
  </div>
</template>

<script lang="js">
import { colorVars } from './utils/colors'

export default {
  props: {
    color: {
      type: String,
      default: 'primary'
    },
    disabled: Boolean,
    label: String,
    value: {},
    val: {}
  },
  data () {
    return {
      focused: false
    }
  },
  computed: {
    selected () {
      return this.value === this.val
    },
    colorVars () {
      return colorVars(this.color)
    }
  },
  methods: {
    select () {
      if (!this.disabled) {
        this.$emit('input', this.val)
      }
    }
  }
}
</script>

<style lang="scss" scoped>
.radio-button {
  display: flex;
  align-items: center;
  margin: 6px;
  outline: none;
  cursor: pointer;
  &[disabled] {
    opacity: 0.75;
    cursor: not-allowed;
  }
  &.selected {
    .radio {
      flex-shrink: 0;
      .outline {
        stroke: var(--color);
      }
      .fill {
        transform: scale(1, 1);
      }
    }
  }
  .radio {
    margin-right: 12px;
    border-radius: 50%;
    transition: box-shadow .4s cubic-bezier(.25,.8,.25,1);
    will-change: box-shadow;
    overflow: visible;
    .outline {
      stroke: #777;
      stroke-width: 1.75;
      fill: none;
      transition: all 0.4s cubic-bezier(.25,.8,.25,1);
    }
    .fill {
      transform-origin: 50% 50%;
      transition: transform 0.4s cubic-bezier(.25,.8,.25,1);
      transform: scale(0, 0);
      fill: var(--color);
    }
  }
  &.focused, &:hover:not([disabled]) {
    .radio {
      box-shadow: 2px 2px 6px rgba(var(--color-rgb), 0.3);
    }
  }
}
</style>
