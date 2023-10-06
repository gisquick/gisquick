<template>
  <div class="f-row-ac">
    <div>
      <v-tooltip>
        <translate>Opacity of overlay layers</translate>
      </v-tooltip>
      <v-icon name="opacity" color="#444"/>
    </div>
    <v-slider
      min="0"
      max="1"
      step="0.01"
      class="f-grow mx-2 my-0"
      :colors="colors"
      marker-blend-color="#bbbbbbff"
      v-model="opacity"
      hide-range-labels
    />
    <span class="value">{{ Math.round(opacity * 100) }}%</span>
  </div>
</template>

<script lang="js">
import { hexColor } from '@/ui/utils/colors'

export default {
  data () {
    const color = getComputedStyle(document.body).getPropertyValue('--color-primary-rgb').split(',').map(Number)
    const colors = [hexColor(color) + '20', hexColor(color) + 'ff']
    return {
      opacity: 1,
      colors
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
  width: 40px;
  text-align: right;
  font-size: 14px;
  opacity: 0.75;
}
</style>
