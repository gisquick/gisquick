<template>
  <div
    role="checkbox"
    class="checkbox"
    :class="{focused, checked}"
    :disabled="disabled"
    :aria-disabled="disabled"
    :aria-checked="checked ? 'true' : 'false'"
    :aria-label="label"
    :style="colorVars"
    :tabindex="disabled ? -1 : 0"
    @focus="focused = !disabled"
    @blur="focused = false"
    @click="toggleValue"
    @keydown.space.prevent="toggleValue"
  >
    <slot name="tooltip"/>
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="20"
      height="20"
      viewBox="0 0 20 20"
      class="check"
    >
      <rect
        class="fill-bg"
        x="1"
        y="1"
        width="18"
        height="18"
        rx="2"
        stroke-width="2"
      />
      <rect
        class="fill"
        width="20"
        height="20"
        rx="2"
      />
      <path
        ref="checkPath"
        class="checkbox--check"
        d="m 5,10.7 4.1,3.6 6,-7.8"
        fill="none"
        stroke-linecap="round"
        stroke-linejoin="round"
        stroke="#fff"
        stroke-width="2"
        :stroke-dasharray="checkLength"
        :stroke-dashoffset="checked ? 0 : checkLength"
      />
    </svg>
    <slot>
      <span v-text="label"/>
    </slot>
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
    falseValue: {
      default: false
    },
    label: String,
    trueValue: {
      default: true
    },
    val: {},
    value: {}
  },
  data () {
    return {
      focused: false,
      checkLength: 16
    }
  },
  computed: {
    colorVars () {
      return colorVars(this.color)
    },
    arrayModel () {
      return Array.isArray(this.value)
    },
    checked () {
      if (this.arrayModel) {
        return this.value.includes(this.val)
      }
      return this.value === this.trueValue
    }
  },
  mounted () {
    this.checkLength = this.$refs.checkPath.getTotalLength()
  },
  methods: {
    toggleValue () {
      if (!this.disabled) {
        let value
        if (this.arrayModel) {
          if (this.checked) {
            value = this.value.filter(v => v !== this.val)
          } else {
            value = this.value.concat(this.val)
          }
        } else {
          value = this.checked ? this.falseValue : this.trueValue
        }
        this.$emit('input', value)
      }
    }
  }
}
</script>

<style lang="scss" scoped>

.checkbox {
  display: flex;
  align-items: center;
  position: relative;
  outline: none;
  user-select: none;
  cursor: pointer;
  margin: 6px;
  &[disabled] {
    opacity: 0.75;
    cursor: not-allowed;
  }
  &.focused, &:hover:not([disabled]) {
    .check {
      box-shadow: 1px 2px 6px rgba(var(--color-rgb), 0.35);
    }
  }
  &.checked {
    .fill {
      fill: var(--color);
    }
  }
  .fill-bg {
    fill: var(--fill-color);
    stroke: currentColor;
    stroke-opacity: 0.75;
  }
  .fill {
    transition: fill 0.4s cubic-bezier(.25,.8,.25,1);
    fill: transparent;
  }
  .check {
    position: relative;
    margin-right: 8px;
    border-radius: 3px;
    transition: box-shadow .4s cubic-bezier(.25,.8,.25,1);
    will-change: box-shadow;
    flex-shrink: 0;
    .checkbox--check {
      transition: stroke-dashoffset 0.18s cubic-bezier(0.4,0,0.6,1) 0ms;
    }
  }
}
</style>
