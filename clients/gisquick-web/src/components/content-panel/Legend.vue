<template>
  <div>
    <img
      v-for="url in legendList"
      :key="url"
      :src="url"
      alt=""
    />
  </div>
</template>

<script>
import { mapGetters } from 'vuex'
import Observable from 'ol/observable'
import debounce from 'lodash/debounce'

export default {
  props: {
    visible: Boolean
  },
  data () {
    return {
      legendList: []
    }
  },
  computed: {
    ...mapGetters(['visibleLayers'])
  },
  watch: {
    visible (visible) {
      this.setActive(visible)
    }
  },
  mounted () {
    this.setActive(this.visible)
  },
  beforeDestroy () {
    this.setActive(false)
  },
  methods: {
    setActive (active) {
      if (active) {
        if (!this.listener) {
          this.listener = this.$map.getView().on('change:resolution', debounce(this.updateLegend, 75))
          this.updateLegend()
        }
      } else if (this.listener) {
        Observable.unByKey(this.listener)
        this.listener = null
      }
    },
    updateLegend () {
      const source = this.$map.overlay.getSource()
      const view = this.$map.getView()
      this.legendList = this.visibleLayers.map(l => source.getLegendUrl(l.name, view))
    }
  }
}
</script>
