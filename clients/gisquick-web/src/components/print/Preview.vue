<template>
  <div class="print-preview">
    <div class="preview-bg left"/>
    <div class="preview-bg right"/>
    <div class="preview-bg top"/>
    <div class="preview-bg bottom"/>

    <div class="f-col f-shrink center column shrink">

      <div class="panel-header f-row-ac">
        <span class="scale mx-2"><translate>Scale</translate> 1: {{ scale }}</span>
        <translate class="title">Print Preview</translate>
        <div class="controls f-row-ac f-justify-end">
          <v-btn class="icon" @click="print">
            <v-icon name="printer"/>
          </v-btn>
          <v-btn class="icon" @click="download('pdf')">
            <v-icon name="download"/>
            <v-tooltip slot="tooltip" align="c;tt,bb">
              <translate>Download PDF file</translate>
            </v-tooltip>
          </v-btn>
          <v-btn class="icon" @click="download('png')">
            <v-icon name="photo"/>
            <v-tooltip slot="tooltip" align="c;tt,bb">
              <translate>Download PNG image</translate>
            </v-tooltip>
          </v-btn>
          <v-btn class="icon" @click="$emit('close')">
            <v-icon name="x"/>
          </v-btn>
        </div>
      </div>

      <div
        ref="templateEl"
        class="template-container"
        :style="size"
      >
        <img
          :style="clipMask"
          :src="templateUrl"
          :key="layout.name"
        />
        <div
          class="map-border"
          :style="borderArea"
        />
        <v-linear-progress
          v-if="showProgressbar"
          class="m-0"
          height="3"
          indeterminate
        />
      </div>
    </div>
  </div>
</template>

<script>
import { mapState } from 'vuex'
import { boundingExtent } from 'ol/extent'
import Point from 'ol/geom/Point'
import { unByKey } from 'ol/Observable'
import axios from 'axios'

import { mmToPx, createPrintParameters } from './utils'

export default {
  props: {
    layout: Object,
    dpi: Number,
    showProgressbar: Boolean
  },
  data () {
    return {
      scale: 0,
      width: 0,
      height: 0,
      visible: false
    }
  },
  computed: {
    ...mapState(['user', 'project']),
    size () {
      return {
        width: Math.round(mmToPx(this.layout.width) / this.scaleRatio) + 'px',
        height: Math.round(mmToPx(this.layout.height) / this.scaleRatio) + 'px'
      }
    },
    borderArea () {
      const layout = this.layout
      return {
        left: (100 * layout.map.x / layout.width) + '%',
        top: (100 * layout.map.y / layout.height) + '%',
        right: (100 * (1 - (layout.map.x + layout.map.width) / layout.width)) + '%',
        bottom: (100 * (1 - (layout.map.y + layout.map.height) / layout.height)) + '%'
      }
    },
    clipMask () {
      const l = this.layout
      const clipPath = `polygon(
        0% 0%,
        100% 0%,
        100% 100%,
        0% 100%,
        0 ${100 * l.map.y / l.height}%,
        ${100 * l.map.x / l.width}% ${100 * l.map.y / l.height}%,
        ${100 * l.map.x / l.width}% ${100 * (l.map.y + l.map.height) / l.height}%,
        ${100 * (l.map.x + l.map.width) / l.width}% ${100 * (l.map.y + l.map.height) / l.height}%,
        ${100 * (l.map.x + l.map.width) / l.width}% ${100 * l.map.y / l.height}%,
        0% ${100 * l.map.y / l.height}%,
        0% 0%
      )`
      return { clipPath }
    },
    templateUrl () {
      const layout = this.layout
      const extent = this.$map.getView().calculateExtent([layout.map.width, layout.map.height])
      const config = {
        dpi: 96,
        format: 'png',
        // qgis3 server doesn't like empty layers parameter!
        layers: [this.project.overlays.list[0].name]
      }
      const params = createPrintParameters(this.$map, layout, extent, config)
      params.gislab_author = this.user.username
      return axios.getUri({ url: this.project.config.ows_url, params })
    },
    scaleRatio () {
      if (this.visible) {
        const layoutWidth = mmToPx(this.layout.width)
        const layoutHeight = mmToPx(this.layout.height)
        const viewWidth = this.width - 40
        const viewHeight = this.height - 40
        if (layoutWidth > viewWidth || layoutHeight > viewHeight) {
          const scale = Math.max(layoutWidth / viewWidth, layoutHeight / viewHeight)
          return scale
        }
      }
      return 1
    }
  },
  watch: {
    scaleRatio (value) {
      this.setScale(value)
    }
  },
  mounted () {
    this.updateSize()
    const view = this.$map.getView()
    const updateScale = () => {
      const scale = view.getScale()
      if (scale) {
        this.scale = view.getScale().toLocaleString()
      }
    }
    updateScale()
    this.listener = view.on('change:resolution', updateScale)
    this.visible = true

    window.addEventListener('resize', this.updateSize)
  },
  beforeDestroy () {
    this.setScale(1)
    unByKey(this.listener)
    window.removeEventListener('resize', this.updateSize)
  },
  methods: {
    updateSize () {
      this.width = this.$el.offsetWidth
      this.height = this.$el.offsetHeight
    },
    setScale (ratio) {
      const map = this.$map
      const mapEl = this.$map.getViewport()
      const percScale = Math.round(100 * ratio) + '%'

      mapEl.style.transformOrigin = 'top left'
      mapEl.style.width = percScale
      mapEl.style.height = percScale
      mapEl.style.transform = `scale(${1 / ratio}, ${1 / ratio})`
      setTimeout(() => map.setSize([window.innerWidth * ratio, window.innerHeight * ratio]))
    },
    calculatePrintArea () {
      const map = this.$map
      const layout = this.layout
      const width = Math.round(mmToPx(layout.map.width))
      const height = Math.round(mmToPx(layout.map.height))
      const mapBounds = map.getViewport().getBoundingClientRect()
      const layoutBounds = this.$refs.templateEl.getBoundingClientRect()
      const x = Math.round((layoutBounds.left - mapBounds.left) * this.scaleRatio + mmToPx(layout.map.x))
      const y = Math.round((layoutBounds.top - mapBounds.top) * this.scaleRatio + mmToPx(layout.map.y))

      const leftTop = new Point([x, y])
      const rightBottom = new Point([x + width, y + height])
      const rotationAnchor = [x + width / 2, y + height / 2]
      leftTop.rotate(map.getView().getRotation(), rotationAnchor)
      rightBottom.rotate(map.getView().getRotation(), rotationAnchor)
      const extent = boundingExtent([
        map.getCoordinateFromPixel(leftTop.getCoordinates()),
        map.getCoordinateFromPixel(rightBottom.getCoordinates())
      ])
      return {
        // coordinates of print area relative to the map
        relative: {
          x: ((layoutBounds.x - mapBounds.x) + (layout.map.x / layout.width) * layoutBounds.width) / mapBounds.width,
          y: ((layoutBounds.y - mapBounds.y) + (layout.map.y / layout.height) * layoutBounds.height) / mapBounds.height,
          width: ((layout.map.width / layout.width) * layoutBounds.width) / mapBounds.width,
          height: ((layout.map.height / layout.height) * layoutBounds.height) / mapBounds.height
        },
        extent
      }
    },
    async print () {
      this.$emit('print', this.calculatePrintArea())
    },
    download (format) {
      this.$emit('download', format, this.calculatePrintArea())
    }
  }
}
</script>

<style lang="scss" scoped>
.print-preview {
  display: grid;
  width: 100%;
  height: 100%;
  max-height: 100%;
  overflow: hidden;
  grid-template-columns: 1fr auto 1fr;
  grid-template-rows: 1fr auto 1fr;
  pointer-events: none;

  .preview-bg {
    background-color: rgba(0,0,0,0.25);
    &.left {
      grid-column: 1 / 2;
      grid-row: 1 / 4;
    }
    &.right {
      grid-column: 3 / 4;
      grid-row: 1 / 4;
    }
    &.top {
      grid-column: 2 / 3;
      grid-row: 1 / 2;
    }
    &.bottom {
      grid-column: 2 / 3;
      grid-row: 3 / 4;
    }
    .center {
      grid-column: 2 / 3;
      grid-row: 2 / 3;
      max-height: 100%;
      overflow: hidden;
    }
  }
}
.panel-header {
  pointer-events: auto;
  .scale {
    font-size: 14px;
  }
  .scale, .controls {
    flex-basis: 0;
    flex-grow: 1;
  }
  .title {
    font-size: 15px;
  }
}

.template-container {
  position: relative;
  opacity: 0.85;

  img {
    position: absolute;
    width: inherit;
    height: inherit;
  }
  .map-border {
    position: absolute;
    border: 2px solid var(--color-primary);
  }
}
</style>
