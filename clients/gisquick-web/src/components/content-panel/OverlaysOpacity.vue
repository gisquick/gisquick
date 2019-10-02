<template>
  <v-layout row shrink mt-1 align-center>
    <v-tooltip top>
      <v-icon slot="activator">opacity</v-icon>
      <translate>Opacity of overlay layers</translate>
    </v-tooltip>
    <v-slider
      min="0"
      max="1"
      step="0.01"
      class="ml-3 mr-2"
      v-model="opacity"
      hide-details
    />
    <span class="value">{{ Math.round(opacity * 100) }}%</span>
  </v-layout>
</template>

<script>
export default {
  data () {
    return {
      opacity: 1
    }
  },
  mounted () {
    this.updateOpacity()
  },
  watch: {
    opacity: 'updateOpacity'
  },
  methods: {
    updateOpacity () {
      this.$map.overlay.setOpacity(this.opacity)
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
.v-icon {
  user-select: none;
}
</style>
