<template functional>
  <v-layout class="text-separator" @click.stop="">
    <v-spacer/>
    <span><slot></slot></span>
    <v-spacer />
  </v-layout>
</template>

<script>
export default {
  functional: true
}
</script>

<style lang="scss">
.v-menu__content {
  .text-separator {
    align-items: center;
    font-size: 80%;
    opacity: 0.5;
    .spacer {
      height: 1px;
      background-color: currentColor;
      margin: 0 0.5em;
      opacity: inherit;
    }
  }
}
</style>
