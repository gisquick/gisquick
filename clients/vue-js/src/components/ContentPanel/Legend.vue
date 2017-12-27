<template>
  <div>
    <img
      v-for="url in legendList"
      :src="url"
      alt="" >
  </div>
</template>p

<script>
import Observable from 'ol/observable'
import debounce from 'lodash/debounce'

export default {
  props: ['project', 'layers', 'visible'],
  data () {
    return {
      legendList: []
    }
  },
  inject: ['$map'],
  watch: {
    visible (visible) {
      this.setActive(visible)
    }
    // layers() {
    //   if (this.visible) {
    //     this.updateLegend()
    //   }
    // }
  },
  computed: {
    vlayers () {
      return this.project.overlays.list.filter(l => l.visible)
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
      this.legendList = this.layers.map(l => source.getLegendUrl(l.name, view))
    }
  }
}
</script>