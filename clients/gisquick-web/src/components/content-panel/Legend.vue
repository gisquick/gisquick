<template>
  <div class="legend">
    <template v-for="item in legendList">
      <div
        v-if="item.type === 'link'"
        :key="item.layer.name"
        class="item link px-2 py-2"
      >
        <strong v-text="item.layer.title"/>
        <a target="_blank" :href="item.url">Link</a>
      </div>
      <img
        v-else
        :key="item.layer.name"
        :src="item.url"
        alt="Legend image"
      />
    </template>
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
    ...mapGetters(['visibleBaseLayer', 'visibleLayers'])
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
      const layers = [
        this.visibleBaseLayer,
        ...this.visibleLayers
      ].filter(l => l && (l.legend_url || l.type === 'vector'))

      this.legendList = layers.map(l => {
        if (l.legend_url) {
          return {
            layer: l,
            type: 'link',
            url: l.legend_url
          }
        }
        return {
          layer: l,
          type: 'image',
          url: source.getLegendUrl(l.name, view)
        }
      })
    }
  }
}
</script>

<style lang="scss" scoped>
.legend {
  .item {
    display: flex;
    flex-direction: column;
    &.link {
      font-size: 14px;
    }
  }
}
</style>
