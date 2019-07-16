<template>
  <v-layout class="row header">
    <v-layout class="row tabs">
      <slot name="tabs"/>
      <div class="tab-end"/>
    </v-layout>
    <v-spacer/>
    <v-layout class="row tabs">
      <div class="tab-start"/>
      <v-btn icon @click="$emit('close')">
        <v-icon small>close</v-icon>
      </v-btn>
    </v-layout>
  </v-layout>
</template>

<script>
export default {

}
</script>

<style lang="scss" scoped>
.header {
  .v-btn {
    height: 100%;
    margin: 0;
    width: 1.75em;
    padding-right: 0.5em;
  }
  .spacer {
    height: 1px;
    align-self: flex-end;
    background-color: #aaa;
    // opacity: 0.99;
    position: relative;
  }
  .tabs {
    pointer-events: auto;
    position: relative;
    height: 1.8em;
    background-color: #fff;
    box-shadow: -4px -4px 8px 0 rgba(0,0,0,.1), -3px -4px 4px -2px rgba(0,0,0,.12);
    border: 1px solid #aaa;
    user-select: none;
    flex: 0 0 auto;
    a {
      position: relative;
      padding: 0.25em 0.75em;
      font-size: 0.813em;
      font-weight: 500;
      &:not(.active) {
        color: #606060;
      }
      &:not(:first-child)::before {
        background-color: #ccc;
        position: absolute;
        content: "";
        left: 0;
        top: 10%;
        bottom: 10%;
        width: 1px;
      }
    }
    .tab-end {
      position: absolute;
      right: -10px;
      top: -1px;
      bottom: -1px;
      width: 15px;
      transform: skewX(20deg);
      border: 1px solid #aaa;
      border-width: 1px 1px 1px 0px;
      border-top-right-radius: 5px;
      background-color: #fff;
      box-shadow: 7px -4px 6px 0 rgba(0,0,0,.1), 4px 0 3px 0 rgba(0,0,0,.12);
      box-sizing: border-box;
    }
    .tab-start {
      position: absolute;
      left: -10px;
      top: -1px;
      bottom: -1px;
      width: 15px;
      transform: skewX(-20deg);
      border: 1px solid #aaa;
      border-width: 1px 0px 1px 1px;
      border-top-left-radius: 5px;
      background-color: #fff;
      box-shadow: -7px -4px 6px 0 rgba(0,0,0,.05), -4px 0 3px 0 rgba(0,0,0,.1);
      box-sizing: border-box;
    }
  }
}
</style>
