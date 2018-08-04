<template>
  <v-layout
    class="row time-info"
    v-if="layer.timeFilter"
  >
    <v-icon>access_time</v-icon>
    <span>{{ layer.original_time_attribute }} {{ layer.timeFilter.timeRange }}</span>
  </v-layout>
</template>

<script>
export default {
  props: ['layer']
}
</script>

<style lang="scss" scoped>
.time-info {
  padding: 0 0.5em;
  background-color: rgba(#EFEBE9, 0.75);
  border-bottom-left-radius: 6px;
  border-bottom-right-radius: 6px;
  // border-top: 1px solid rgba(#777, 0.25);
  border-bottom: 1px solid rgba(#777, 0.25);
  opacity: 0.75;
  .v-icon {
    font-size: 16px;
    margin-right: 0.25em;
  }
  span {
    font-size: 13px;
  }
}
</style>
