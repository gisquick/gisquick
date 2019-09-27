<template>
  <div class="print-preview">
    <div class="preview-bg left"/>
    <div class="preview-bg right"/>
    <div class="preview-bg top"/>
    <div class="preview-bg bottom"/>

    <v-layout class="center column shrink">

      <v-toolbar dark flat height="30">
        <span class="scale flex"><translate>Scale</translate> 1: {{ scale }}</span>
        <v-spacer/>
          <translate tag="h1">Print Preview</translate>
        <v-spacer/>
        <v-layout class="controls">
          <v-btn icon @click="print">
            <icon name="printer"/>
          </v-btn>
          <v-btn icon @click="download">
            <icon name="download"/>
          </v-btn>
          <v-btn icon @click="$emit('close')">
            <icon name="x"/>
          </v-btn>
        </v-layout>
      </v-toolbar>

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
        <v-progress-linear
          v-if="showProgressbar"
          absolute
          indeterminate
          class="my-0"
          height="3"
        />
      </div>
    </v-layout>
  </div>
</template>

<script>
import { mapState, mapGetters } from 'vuex'
import axios from 'axios'
import Observable from 'ol/observable'
import FileSaver from 'file-saver'
import { mmToPx, createPrintParameters, formatCopyrights, scaleAnimation, openPrintWindow } from './utils'

export default {
  props: {
    layout: Object,
    format: String,
    dpi: Number,
    labelsData: Object
  },
  data () {
    return {
      scale: 0,
      width: 0,
      height: 0,
      visible: false,
      showProgressbar: false
    }
  },
  computed: {
    ...mapState(['user', 'project']),
    ...mapGetters(['visibleBaseLayer']),
    size () {
      return {
        width: mmToPx(this.layout.width) / this.scaleRatio + 'px',
        height: mmToPx(this.layout.height) / this.scaleRatio + 'px'
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
    Observable.unByKey(this.listener)
    window.removeEventListener('resize', this.updateSize)
  },
  methods: {
    updateSize () {
      this.width = this.$el.offsetWidth
      this.height = this.$el.offsetHeight
    },
    setScale (ratio) {
      const map = this.$map
      // const mapEl = this.$map.getViewport()
      // const percScale = Math.round(100 * ratio) + '%'

      // mapEl.style.transformOrigin = 'top left'
      // mapEl.style.width = percScale
      // mapEl.style.height = percScale
      // mapEl.style.transform = `scale(${1 / ratio}, ${1 / ratio})`
      // map.setSize([window.innerWidth * ratio, window.innerHeight * ratio])

      scaleAnimation(map, { from: this.prevScale || 1, to: ratio })
      this.prevScale = ratio

      if (ratio !== 1) {
        if (!map.transformBrowserEvent) {
          map.transformBrowserEvent = evt => {
            const scale = this.scaleRatio
            evt.pixel[0] = evt.pixel[0] * scale
            evt.pixel[1] = evt.pixel[1] * scale
            evt.coordinate = map.getCoordinateFromPixel(evt.pixel)
            if (evt.pointerEvent) {
              evt.pointerEvent.clientX = evt.pointerEvent.screenX * scale
              evt.pointerEvent.clientY = evt.pointerEvent.screenY * scale
            }
          }
        }
      } else {
        delete map.transformBrowserEvent
      }
    },
    printRequest (opts) {
      const map = this.$map
      const layout = this.layout

      const width = mmToPx(layout.map.width)
      const height = mmToPx(layout.map.height)
      const mapBounds = map.getViewport().getBoundingClientRect()
      const layoutBounds = this.$refs.templateEl.getBoundingClientRect()

      const left = (layoutBounds.left - mapBounds.left) * this.scaleRatio + mmToPx(layout.map.x)
      const top = (layoutBounds.top - mapBounds.top) * this.scaleRatio + mmToPx(layout.map.y)

      const center = map.getCoordinateFromPixel([left + width / 2, top + height / 2])
      const resolution = map.getView().getResolution()
      var extent = [
        center[0] - resolution * width / 2,
        center[1] - resolution * height / 2,
        center[0] + resolution * width / 2,
        center[1] + resolution * height / 2
      ]

      const layers = []
      if (this.visibleBaseLayer.type === 'wms') {
        const name = this.visibleBaseLayer.serverName || this.visibleBaseLayer.name
        layers.push(name)
      }
      layers.push(...map.overlay.getSource().getVisibleLayers())

      const config = {
        dpi: this.dpi,
        format: this.format,
        layers,
        ...opts
      }
      const copyrights = formatCopyrights(map.overlay.getSource().getAttributions())
      const params = {
        ...createPrintParameters(map, layout, extent, config),
        // TODO: other hidden labels
        gislab_copyrights: copyrights,
        ...this.labelsData[layout.name]
      }
      return axios.getUri({ url: this.project.config.ows_url, params })
    },
    print () {
      const url = this.printRequest({ format: 'png' })
      openPrintWindow(this.layout, url)
    },
    download () {
      const url = this.printRequest()
      this.showProgressbar = true
      this.$http.get(url, { responseType: 'blob' })
        .then(resp => {
          this.showProgressbar = false
          const timeString = new Date().toISOString()
          const timeStamp = timeString.substring(11, 19).split(':').join('-')
          const filename = `${this.layout.name}_${timeStamp}.${this.format}`
          FileSaver.saveAs(resp.data, filename)
        })
        .catch(err => {
          this.showProgressbar = false
          console.error(err)
        })
    }
  }
}
</script>

<style lang="scss" scoped>
@import '../../theme.scss';

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
.v-toolbar {
  .scale {
    font-size: 90%;
    position: absolute;
    left: 0.5em;
  }
  pointer-events: auto;
  h1 {
    font-size: 1em;
  }
  .controls {
    position: absolute;
    right: 0;
  }
  .v-btn {
    margin: 0;
    width: 32px;
    height: 30px;
  }
  .icon {
    width: 20px;
    height: 20px;
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
    border: 2px solid $primary-color;
  }
}
</style>
