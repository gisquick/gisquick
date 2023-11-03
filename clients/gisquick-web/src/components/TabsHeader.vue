<template>
  <div class="tabs-header dark f-row">
    <div class="tabs f-row-ac">
      <slot name="tabs"/>
      <div class="separator"/>
      <v-btn class="icon" @click="$emit('update:minimized', !minimized)">
        <v-icon class="minimize" :class="{minimized}" name="arrow-down"/>
      </v-btn>
      <v-btn class="icon" @click="$emit('close')">
        <v-icon name="x"/>
      </v-btn>
      <div class="tab-end"/>
      <!-- <svg class="tab-end2" viewBox="0 0 10 10" preserveAspectRatio="none">
        <path d="M 6.8,0 L 10,0 L 10,10 L 0,10"/>
      </svg> -->
    </div>
    <div class="f-grow"/>
    <!-- <div class="tabs f-row">
      <div class="tab-start"/>
      <v-btn class="icon ml-0" @click="$emit('close')">
        <v-icon name="x"/>
      </v-btn>
    </div> -->
  </div>
</template>

<script lang="js">
export default {
  props: {
    minimized: Boolean
  }
}
</script>

<style lang="scss" scoped>
.tabs-header {
  --color-dark: #404040;
  font-size: 13.5px;
  .tabs {
    pointer-events: auto;
    position: relative;
    height: 28px;
    background-color: var(--color-dark);

    box-shadow: -4px -4px 8px 0 rgba(0,0,0,.1), -3px -4px 4px -2px rgba(0,0,0,.12);
    user-select: none;
    flex: 0 0 auto;
    background-color: var(--color-dark);

    .item {
      position: relative;
      padding: 4px 8px;
      font-weight: 500;
      cursor: pointer;
      &.active {
        background-color: var(--color-primary);
        // border: 1px solid var(--color-dark);
        // color: var(--color-primary);
        // &::after {
        //   background-color: var(--color-primary);
        //   position: absolute;
        //   content: "";
        //   left: 0;
        //   right: 0;
        //   bottom: 0px;
        //   height: 3px;
        // }
      }
      &:not(.active) {
        // border: solid #ffffffaa;
        // border-width: 0 1px;
        &::after {
          background-color: #ffffff77;
          position: absolute;
          content: "";
          right: -1px;
          top: 4px;
          bottom: 4px;
          width: 1px;
        }
      }
    }
    .separator {
      background-color: #ffffff77;
      width: 1px;
      margin: 4px;
      height: calc(100% - 8px);
    }
    .tab-end {
      position: absolute;
      right: -10px;
      top: 0;
      bottom: 0;
      width: 15px;
      transform: skewX(20deg);
      border-top-right-radius: 5px;
      background-color: var(--color-dark);
      box-shadow: 5px -3px 5px 0 rgba(0,0,0,.12);
      box-sizing: border-box;
    }
    .tab-end2 {
      position: absolute;
      height: 100%;
      right: -9px;
      top: 0;
      bottom: -4px;
      width: 15px;
      transform: skewX(20deg);
      border-top-right-radius: 5px;
      box-shadow: 5px -3px 5px 0 rgba(0,0,0,.12);
      box-sizing: border-box;
      path {
        fill: var(--color-dark);
      }
    }
    .tab-start {
      position: absolute;
      left: -10px;
      top: 0;
      bottom: -1px;
      width: 15px;
      transform: skewX(-20deg);
      border-top-left-radius: 5px;
      background-color: var(--color-dark);
      box-shadow: -5px -3px 5px 0 rgba(0,0,0,.12);
      box-sizing: border-box;
    }
  }
}
.icon {
  width: 16px;
  height: 16px;
}
.minimize {
  transition: transform 0.4s ease;
  &.minimized {
    // transform: rotate(180deg);
    transform: rotateX(180deg);
  }
}
</style>
