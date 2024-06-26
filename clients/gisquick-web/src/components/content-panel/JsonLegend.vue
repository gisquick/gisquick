<template>
  <div class="legend">
    <div class="status f-col">
      <v-linear-progress
        v-if="task.pending"
        color="primary"
        width="3"
        indeterminate
      />
      <div v-if="!task.pending && task.error" class="error f-row-ac dark">
        <v-icon name="warning" class="mr-2" size="17"/>
        <translate>Error</translate>
      </div>
    </div>
    <template v-for="{ type, layer, url, data} in legendList">
      <div
        v-if="type === 'link'"
        :key="layer.name"
        class="item link px-2 py-2"
      >
        <strong v-text="layer.title"/>
        <a target="_blank" :href="url">Link</a>
      </div>
      <div
        v-else-if="data"
        :key="layer.name"
        class="item"
        :class="data.type"
      >
        <span v-if="data.title" class="title" v-text="data.title"/>
        <!-- without duplicit title -->
        <!-- <span v-if="data.title && !data.icon" class="title" v-text="data.title"/> -->
        <div v-if="data.icon" class="symbol f-row">
          <div class="img-box">
            <img :src="`data:image/png;base64, ${data.icon}`"/>
          </div>
          <span class="title" v-text="data.title"/>
        </div>
        <template v-else-if="data.symbols">
          <div
            v-for="(s, si) in data.symbols"
            :key="`s:${si}`"
            class="symbol pad-l f-row"
          >
            <div class="img-box">
              <img v-if="s.icon" :src="`data:image/png;base64, ${s.icon}`"/>
            </div>
            <span class="title" v-text="s.title"/>
          </div>
        </template>
      </div>
    </template>
  </div>
</template>

<script>
import { mapGetters, mapState } from 'vuex'
import { unByKey } from 'ol/Observable'
import debounce from 'lodash/debounce'

import { TaskState, watchTask } from '@/tasks'

const BaseLegendParams = {
  SERVICE: 'WMS',
  VERSION: '1.1.1',
  REQUEST: 'GetLegendGraphic',
  FORMAT: 'application/json',
  EXCEPTIONS: 'application/vnd.ogc.se_xml',
  SYMBOLHEIGHT: '14',
  SYMBOLWIDTH: '16'
}

export default {
  props: {
    visible: Boolean
  },
  data () {
    return {
      task: TaskState(),
      legendList: []
    }
  },
  computed: {
    ...mapState(['project']),
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
    async updateLegend () {
      if (!this.visible) {
        return
      }
      const view = this.$map.getView()
      const url = new URL(this.project.config.ows_url, location.origin)
      Object.keys(BaseLegendParams).forEach(k => url.searchParams.set(k, BaseLegendParams[k]))
      url.searchParams.set('SCALE', Math.round(view.getScale()))
      if (this.dpi) {
        // DPI has no effect in JSON format 
        url.searchParams.set('DPI', this.dpi)
      }
      // fetch whole legend in single request
      url.searchParams.set('LAYERS', this.legendLayers.map(l => l.name).join(','))

      const { data } = await watchTask(this.$http.get(url.toString()), this.task)
      this.legendList = this.legendLayers.map(l => {
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
          data: data.nodes.find(n => n.type === 'layer' && (n.title === l.title || n.title === l.name))
        }
      })

      // fetch legend of each layer separately
      // this.legendList = this.legendLayers.map(l => {
      //   if (l.legend_url) {
      //     return {
      //       layer: l,
      //       type: 'link',
      //       url: l.legend_url
      //     }
      //   }
      //   url.searchParams.set('LAYER', l.name)
      //   const data = {
      //     layer: l,
      //     type: 'image',
      //     data: null
      //   }
      //   this.$http.get(url.toString()).then(resp => {
      //     data.data = resp.data.nodes[0]
      //   })
      //   return data
      // })
    }
  }
}
</script>

<style lang="scss" scoped>
.legend {
  display: flex;
  flex-direction: column;
  position: relative;
  width: 100%;
  min-height: 24px;
  .status {
    top: 0;
    position: sticky;
    z-index: 1;
    height: 6px;
  }
  .linear-progress {
    margin: 2px 3px 2px 3px;
    flex-shrink: 0;
  }
  .error {
    font-weight: 500;
    font-size: 14px;
    background: var(--color-red);
    border-radius: 18px;
    align-self: center;
    padding-inline: 10px;
    opacity: 0.92;
  }
  .item {
    display: flex;
    flex-direction: column;
    &.link {
      font-size: 14px;
    }
    &.layer {
      padding: 3px;
      margin-block: 3px;
      > .title {
        font-weight: 500;
      }
      .title {
        padding-inline: 3px;
        display: flex;
        line-height: 1.25;
      }
    }
    .symbol {
      padding: 2px 4px;
      align-items: center;
      &.pad-l {
        padding-left: 14px;
      }
      .img-box {
        display: grid;
        align-items: center;
        justify-content: center;
        min-width: 16px;
        min-height: 16px;
      }
      img {
        max-width: 24px;
        max-height: 24px;
        display: flex;
      }
    }
  }
}
</style>
