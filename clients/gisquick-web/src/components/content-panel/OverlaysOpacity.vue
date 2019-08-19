<template>
  <v-layout row shrink mt-1 align-center>
    <v-tooltip top>
      <v-icon slot="activator">opacity</v-icon>
      <translate>Transparency of overlay layers</translate>
    </v-tooltip>
    <v-slider
      min="0"
      max="1"
      step="0.01"
      class="ml-3 mr-2"
      v-model="transparency"
      hide-details
    />
    <span class="value">{{ Math.round(transparency * 100) }}%</span>
  </v-layout>
</template>

<script>
export default {
  data () {
    return {
      transparency: 0
    }
  },
  mounted () {
    this.updateTransparency()
  },
  watch: {
    transparency: 'updateTransparency'
  },
  methods: {
    updateTransparency () {
      this.$map.overlay.setOpacity(1 - this.transparency)
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
