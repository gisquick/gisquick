<template>
  <component
    :is="tag"
    tabindex="0"
    type="button"
    class="btn"
    v-bind="passedProps"
    :class="classes"
    :disabled="disabled || loading"
    :role="tag !== 'button' ? 'button' : undefined"
    :style="colorVars"
    @click="onClick"
  >
    <slot name="tooltip"/>
    <span class="btn__content">
      <slot/>
    </span>
    <v-spinner v-if="loading" class="loading-spinner"/>
  </component>
</template>

<script lang="js">
import { colorVars } from './utils/colors'
import VSpinner from './Spinner.vue'

export default {
  components: { VSpinner },
  props: {
    active: Boolean,
    disabled: Boolean,
    color: String,
    icon: Boolean,
    href: String,
    loading: Boolean,
    outlined: Boolean,
    role: {
      type: String,
      default: 'button'
    },
    to: [String, Object],
    activeClass: String,
    exactActiveClass: String
  },
  computed: {
    colorVars () {
      return this.color && colorVars(this.color)
    },
    classes () {
      return {
        active: this.active,
        icon: this.icon,
        outlined: this.outlined,
        styled: !!this.color,
        loading: this.loading
      }
    },
    tag () {
      // if (this.to && !this.disabled) {
      //   return 'nuxt-link'
      // }
      return this.href && !this.disabled ? 'a' : 'button'
    },
    passedProps () {
      if (this.tag === 'nuxt-link') {
        return {
          to: this.to,
          activeClass: this.activeClass,
          exactActiveClass: this.exactActiveClass
        }
      } else if (this.tag === 'a') {
        return {
          href: this.href
        }
      }
      return null
    }
  },
  methods: {
    onClick (e) {
      this.$emit('click', e)
    }
  }
}
</script>

<style lang="scss" scoped>
a {
  color: inherit;
}
.btn {
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  outline: none;
  border-radius: 3px;
  transition: all .4s cubic-bezier(.25,.8,.25,1);
  position: relative;
  cursor: pointer;
  min-width: 36px;
  font-family: inherit;
  font-size: inherit;
  margin: var(--gutter, 6px);
  background-color: transparent;
  box-sizing: border-box;

  &::before {
    content: "";
    transition: inherit;
    position: absolute;
    left: 0;
    top: 0;
    right: 0;
    bottom: 0;
    border-radius: inherit;
  }
  &.styled:not(.light) {
    color: #fff;
    --icon-color: #fff;
  }
  &[disabled] {
    cursor: not-allowed;
    opacity: 0.5;
  }
  &:not(.icon) {
    height: 36px;
    // max-height: 100%;
    // font-size: 14px;
    font-weight: 500;
    text-transform: uppercase;
    text-decoration: none;
    padding: 0 12px;
    white-space: nowrap;
    &.round {
      border-radius: 18px;
      padding: 0 16px;
    }
  }
  &:not(.flat) {
    &:hover:not([disabled]), &:focus {
      &.styled {
        box-shadow: 0 6px 16px rgba(var(--color-rgb), 0.25);
      }
      &::before {
        background-color: rgba(#111, 0.08);
      }
    }
    &:active:not([disabled]) {
      &::before {
        background-color: rgba(#111, 0.15);
      }
    }
    &[disabled] {
      // cursor: not-allowed;
      // &::before {
        // background-color: rgba(#fff, 0.35);
      // }
    }
  }
  &.flat {
    background-color: transparent;
    &.styled {
      color: var(--color);
    }
    // &[disabled] {
    //   opacity: 0.5;
    // }
  }
  &.styled:not(.outlined):not(.flat) {
    background-color: var(--color);
  }
  &.outlined {
    &.styled {
      color: var(--color);
    }
    border: 1px solid currentColor;
    background-color: transparent;
    &::before {
      opacity: 0.5;
    }
  }
  &.small {
    min-width: 32px;
    height: 24px;
    font-size: 14px;
    &.round {
      border-radius: 16px;
    }
  }
  &.icon {
    min-width: 0;
    &.styled.flat {
      --icon-color: var(--color);
    }
    &.round {
      border-radius: 50%;
    }
    // &[disabled] {
    //   opacity: 0.4;
    // }
    &.small {
      width: 24px;
      height: 24px;
    }
  }
  &.loading {
    .btn__content {
      visibility: hidden;
    }
  }
  .btn__content {
    color: inherit;
    position: relative;
    display: flex;
    align-items: center;
  }
  .loading-spinner {
    position: absolute;
    align-self: center;
  }
}
</style>
