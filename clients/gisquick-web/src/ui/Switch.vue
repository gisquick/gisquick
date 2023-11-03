<template>
  <div
    role="checkbox"
    class="switch"
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
    <div class="toggle"/>
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
    value: [Boolean, Array]
  },
  data () {
    return {
      focused: false
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

.switch {
  display: flex;
  position: relative;
  outline: none;
  user-select: none;
  cursor: pointer;
  margin: 6px;
  background-color: #777;
  height: 15px;
  width: 28px;
  border-radius: 4px;
  &[disabled] {
    opacity: 0.75;
    cursor: not-allowed;
  }
  &.focused, &:hover:not([disabled]) {
    box-shadow: 2px 2px 6px rgba(var(--color-rgb), 0.25);
  }
  &.checked {
    background-color: var(--color);
    .toggle {
      transform: translate(13px, 0);
    }
  }
  .toggle {
    transition: all 0.4s cubic-bezier(.25,.8,.25,1);
    background-color: #fff;
    border-radius: 4px;
    width: 13px;
    margin: 1px;
  }
  &.round {
    border-radius: 8px;
    .toggle {
      border-radius: 8px;
    }
  }
}
</style>
