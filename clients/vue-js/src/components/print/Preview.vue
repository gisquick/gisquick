<template>
  <v-layout class="print-preview">
    <div class="preview-bg"></div>
    <v-layout class="column shrink">
      <div class="preview-bg"></div>
      <v-layout class="column shrink">

        <v-toolbar dark flat height="30">
          <span flex>Scale 1: {{ scale }}</span>
          <v-spacer></v-spacer>
          <h1>Print Preview</h1>
          <v-spacer></v-spacer>
          <v-layout class="controls">
            <v-btn icon @click="print">
              <icon name="printer" />
            </v-btn>
            <v-btn icon @click="download">
              <icon name="download" />
            </v-btn>
            <v-btn icon @click="$emit('close')">
              <icon name="x" />
            </v-btn>
          </v-layout>
        </v-toolbar>

        <div
          ref="templateEl"
          class="template-container"
          :style="size">
          <img
            :style="clipMask"
            :src="templateUrl"
            :key="layout.name"
          />
          <div
            class="map-border"
            :style="borderArea">
          </div>
        </div>

      </v-layout>
      <div class="preview-bg"></div>
    </v-layout>
    <div class="preview-bg"></div>
  </v-layout>
</template>

<script>
import Observable from 'ol/observable'
import FileSaver from 'file-saver'
import HTTP from '../../client'
import { mmToPx, createPrintParameters, formatCopyrights, scaleAnimation, openPrintWindow } from './utils'


export default {
  props: ['layout', 'format', 'dpi', 'labelsData'],
  inject: ['$project', '$map'],
  data: () => ({
    scale: 0,
    width: 0,
    height: 0,
    visible: false
  }),
  computed: {
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
        layers: []
      }
      const params = createPrintParameters(this.$map, layout, extent, config)
      return HTTP.appendParams(this.$project.ows_url, params)
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
      console.log('Update Size')
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

      scaleAnimation(map, {from: this.prevScale || 1, to: ratio})
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

      const config = Object.assign({
        dpi: this.dpi,
        format: this.format
      }, opts)
      const copyrights = formatCopyrights(map.overlay.getSource().getAttributions())
      const printParams = Object.assign(
        createPrintParameters(map, layout, extent, config),
        // TODO: other hidden labels
        { gislab_copyrights: copyrights },
        this.labelsData[layout.name]
      )
      return HTTP.appendParams(this.$project.ows_url, printParams)
    },
    print () {
      const url = this.printRequest({format: 'png'})
      openPrintWindow(this.layout, url)
    },
    download () {
      const url = this.printRequest()
      HTTP.get(url, {responseType: 'blob'})
        .then(resp => {
          const timeString = new Date().toISOString()
          const timeStamp = timeString.substring(11, 19).split(':').join('-')
          const filename = `${this.layout.name}_${timeStamp}.${this.format}`
          FileSaver.saveAs(resp.data, filename)
        })
    }
  }
}
</script>

<style lang="scss">
@import '../../theme.scss';

.print-preview {

  pointer-events: none!important;
  .preview-bg {
    background-color: rgba(0,0,0,0.25);
    flex-grow: 1;
  }

  .v-toolbar {
    span {
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
}
</style>
