<template>
  <div class="i-field" :style="styles">
    <label
      v-if="label"
      @click="focus ? focus() : null"
      v-text=label
    />
    <slot/>
    <span v-if="error" class="error" v-text="error"/>
  </div>
</template>

<script lang="js">
import { colorVars } from './utils/colors'

export default {
  props: {
    label: String,
    focus: Function,
    error: String,
    color: String
  },
  computed: {
    baseColorStyle () {
      return this.color ? colorVars(this.color) : {}
    },
    statusStyle () {
      return this.error ? colorVars('red', 'status-color') : {}
    },
    styles () {
      return { ...this.baseColorStyle, ...this.statusStyle }
    }
  }
}
</script>

<style lang="scss" scoped>
.i-field {
  display: grid;
  margin: var(--gutter);
  position: relative;
  // transition: all .4s cubic-bezier(.25,.8,.25,1);

  .input {
    height: 32px;
    position: relative;
    transition: all .4s cubic-bezier(.25,.8,.25,1);
    &::after {
      content: "";
      position: absolute;
      // bottom: -2px;
      bottom: 0;
      right: 0;
      width: 0;
      height: 1px;
      background-color: var(--status-color, var(--color));
      transition: width .3s cubic-bezier(.25,.8,.25,1);
      z-index: 1;
    }
  }
  &.focused {
    .input {
      --border-color: var(--status-color, var(--color));
      // box-shadow: 2px 4px 10px rgba(var(--color-rgb), 0.12);
      &::after {
        width: 100%;
        box-shadow: 1px 4px 6px rgba(var(--color-rgb), 0.35);
      }
    }
  }

  &.flat {
    .input {
      border: solid var(--border-color);
      border-width: 0 0 1px 0;
      &[disabled] {
        // background-color: #EAEAEA;
        border-style: dashed;
      }
    }
  }
  &.filled {
    gap: 2px;
    .input {
      padding: 2px 4px;

      border: 1px solid var(--status-color, var(--border-color));
      // border: 1px solid;
      border-radius: 3px;
      background-color: var(--fill-color);

      &[disabled] {
        // --fill-color: transparent;
        // border-style: dashed;
        opacity: 0.5;
      }
    }
  }

  &.inline {
    align-items: center;
    grid-auto-flow: column;
    gap: 6px;

    label {
      font-size: 12px;
    }
  }

  &.semi-flat {
    gap: 2px;
    .input {
      padding: 0 6px;
      margin-top: 3px;
      border: solid var(--border-color);
      border-width: 0 0 1px 0;
      background-color: var(--fill-color);
      // border-top-left-radius: 3px;
      // border-top-right-radius: 3px;
      &[disabled] {
        border-style: dashed;
        opacity: 0.7;
      }
    }
  }

  label {
    justify-self: start;
    line-height: 1;
    text-transform: uppercase;
    font-size: 11.5px;
    opacity: 0.75;
    color: var(--status-color, currentColor);
    font-weight: 500;

    // color: var(--status-color, rgba(currentColor, 0.5));
  }
  &.focused {
    label {
      opacity: 1;
      color: var(--status-color, var(--color));
    }
  }
  &.required {
    label {
      font-weight: 700;
    }
  }
  .error {
    color: var(--color-red);
    font-size: 12.5px;
    // font-weight: 500;
    min-height: 20px;
    padding: 2px 0;
  }
}

  // box-shadow: 2px 4px 8px rgba(#000, 0.05);
  // box-shadow: 2px 4px 10px rgba(#000, 0.15);
  // border-top-left-radius: 4px;
  // border-top-right-radius: 4px;
</style>
