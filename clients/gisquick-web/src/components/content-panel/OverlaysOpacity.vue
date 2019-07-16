<template>
  <v-layout row shrink mt-1 align-center>
    <v-tooltip top>
      <v-icon slot="activator">opacity</v-icon>
      <span>Opacity of overlay layers</span>
    </v-tooltip>
    <v-slider
      min="0"
      max="1"
      step="0.01"
      class="ml-3 mr-2"
      v-model="overlaysOpacity"
      hide-details
    />
    <span class="value">{{ Math.round(overlaysOpacity * 100) }}%</span>
  </v-layout>
</template>

<script>
export default {
  data () {
    return {
      overlaysOpacity: 1
    }
  },
  mounted () {
    this.updateOpacity()
  },
  watch: {
    overlaysOpacity: 'updateOpacity'
  },
  methods: {
    updateOpacity () {
      this.$map.overlay.setOpacity(this.overlaysOpacity)
    }
  }
}
</script>

<style lang="scss" scoped>
.value {
  width: 4em;
  text-align: right;
  font-size: 90%;
  opacity: 0.75;
}
</style>
