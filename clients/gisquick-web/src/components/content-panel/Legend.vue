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
        :srcset="item.srcset"
        :alt="item.layer.title"
      />
    </template>
  </div>
</template>

<script lang="js">
import { mapGetters } from 'vuex'
import { unByKey } from 'ol/Observable'
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
    ...mapGetters(['visibleBaseLayer', 'visibleLayers']),
    legendLayers () {
      return [
        this.visibleBaseLayer,
        ...this.visibleLayers
      ].filter(l => l && !l.legend_disabled && l.drawing_order > -1)
    },
    dpi () {
      return window.devicePixelRatio > 1 ? Math.round(92 * window.devicePixelRatio) : null
    }
  },
  watch: {
    visible (visible) {
      this.setActive(visible)
    },
    legendLayers: 'updateLegend'
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
        unByKey(this.listener)
        this.listener = null
      }
    },
    updateLegend () {
      if (!this.visible) {
        return
      }
      const source = this.$map.overlay.getSource()
      const view = this.$map.getView()
      this.legendList = this.legendLayers.map(l => {
        if (l.legend_url) {
          return {
            layer: l,
            type: 'link',
            url: l.legend_url
          }
        }
        const opts = this.dpi ? { DPI: this.dpi } : null
        const url = source.getLegendUrl(l.name, view, opts)
        return {
          layer: l,
          type: 'image',
          url,
          srcset: window.devicePixelRatio > 1 ? `${url} ${window.devicePixelRatio}x` : null
        }
      })
    }
  }
}
</script>

<style lang="scss" scoped>
.legend {
  img {
    display: block;
  }
  .item {
    display: flex;
    flex-direction: column;
    &.link {
      font-size: 14px;
    }
  }
}
</style>
