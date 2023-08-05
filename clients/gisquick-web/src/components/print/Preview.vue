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
          <v-btn class="icon" @click="download">
            <v-icon name="download"/>
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
import { mapState, mapGetters } from 'vuex'
import { boundingExtent } from 'ol/extent'
import axios from 'axios'
import combineURLs from 'axios/lib/helpers/combineURLs'
import { unByKey } from 'ol/Observable'
import FileSaver from 'file-saver'

import { mmToPx, createPrintParameters, formatCopyrights, scaleAnimation, openPrintWindow } from './utils'

export default {
  props: {
    layout: Object,
    format: String,
    dpi: Number,
    labelsData: Object,
    drawMeasurements: Boolean
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
      map.setSize([window.innerWidth * ratio, window.innerHeight * ratio])

      // scaleAnimation(map, { from: this.prevScale || 1, to: ratio })
      // this.prevScale = ratio

      if (ratio !== 1) {
        if (!map.transformBrowserEvent) {
          map.transformBrowserEvent = evt => {
            const scale = this.scaleRatio
            // evt.pixel[0] = evt.pixel[0] * scale
            // evt.pixel[1] = evt.pixel[1] * scale
            // evt.coordinate = map.getCoordinateFromPixel(evt.pixel)
            if (!evt.originalEvent._transformed) {
              const { clientX, clientY } = evt.originalEvent
              Object.defineProperty(evt.originalEvent, 'clientX', { value: Math.round(clientX * scale ), configurable: true, enumerable: true })
              Object.defineProperty(evt.originalEvent, 'clientY', { value: Math.round(clientY * scale), configurable: true, enumerable: true })
              Object.defineProperty(evt.originalEvent, '_transformed', { value: true, configurable: true, enumerable: true })
            }
          }
        }
      } else {
        delete map.transformBrowserEvent
      }
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
      const leftTop = map.getCoordinateFromPixel([x, y])
      const rightBottom = map.getCoordinateFromPixel([x + width, y + height])
      const extent = boundingExtent([leftTop, rightBottom])
      return {
        screen: { x, y, width, height },
        extent
      }
    },
    printRequest (extent, opts) {
      const map = this.$map
      const layers = []
      if (this.visibleBaseLayer?.name) {
        layers.push(this.visibleBaseLayer.name)
      }
      layers.push(...map.overlay.getSource().getVisibleLayers())

      const config = {
        dpi: this.dpi,
        format: this.format,
        layers,
        ...opts
      }
      const attributions = map.overlay.getSource().getAttributions()()
      const copyrights = formatCopyrights(attributions)
      const params = {
        ...createPrintParameters(map, this.layout, extent, config),
        // TODO: other hidden labels
        gislab_copyrights: copyrights,
        ...this.labelsData[this.layout.name]
      }
      return combineURLs(location.origin, axios.getUri({ url: this.project.config.ows_url, params }))
    },
    async print () {
      const { extent } = this.calculatePrintArea()
      let url = this.printRequest(extent, { format: 'png' })
      if (this.drawMeasurements) {
        const blob = await this.createPngWithOverlay()
        url = URL.createObjectURL(blob)
        setTimeout(() => URL.revokeObjectURL(url), 30000)
      }
      openPrintWindow(this.layout, url)
    },
    async download () {
      let fnName = 'directDownload'
      if (this.drawMeasurements) {
        fnName = this.format === 'pdf'? 'createPdfWithOverlay' : 'createPngWithOverlay'
      }
      this.showProgressbar = true
      try {
        const blob = await this[fnName]()
        const timeString = new Date().toISOString()
        const timeStamp = timeString.substring(11, 19).split(':').join('-')
        const filename = `${this.layout.name}_${timeStamp}.${this.format}`
        FileSaver.saveAs(blob, filename)
      } catch (err) {
        console.error(err)
        // TODO: show error notification
      } finally {
        this.showProgressbar = false
      }
    },
    async directDownload () {
      const { extent } = this.calculatePrintArea()
      const url = this.printRequest(extent)
      const { data } = await this.$http.get(url, { responseType: 'blob' })
      return data
    },
    async createPdfWithOverlay () {
      const PDFDocument = (await import(/* webpackChunkName: "pdf-lib" */'./pdf-lib')).PDFDocument
      const { screen, extent } = this.calculatePrintArea()
      const url = this.printRequest(extent)
      const { data } = await this.$http.get(url, { responseType: 'arraybuffer' })
      const map = this.$map
      const layout = this.layout
      const mapCanvas = document.createElement('canvas')
      mapCanvas.width = screen.width
      mapCanvas.height = screen.height
      const ctx = mapCanvas.getContext('2d')
      return new Promise(resolve => {
        map.once('rendercomplete', async function () {
          const canvas = map.getViewport().querySelector('.ol-layer.measure canvas')
          if (canvas.width > 0) {
            const opacity = canvas.parentNode.style.opacity || canvas.style.opacity
            ctx.globalAlpha = opacity === '' ? 1 : Number(opacity)
            let matrix
            const transform = canvas.style.transform
            if (transform) {
              // Get the transform parameters from the style's transform matrix
              matrix = transform
                .match(/^matrix\(([^\(]*)\)$/)[1]
                .split(',')
                .map(Number)
            } else {
              matrix = [
                parseFloat(canvas.style.width) / canvas.width, 0, 0,
                parseFloat(canvas.style.height) / canvas.height, 0, 0
              ]
            }
            // Apply the transform to the export map context
            CanvasRenderingContext2D.prototype.setTransform.apply(ctx, matrix)
            ctx.drawImage(canvas, screen.x, screen.y, screen.width, screen.height, 0, 0, screen.width, screen.height)
          }
          ctx.globalAlpha = 1
          ctx.setTransform(1, 0, 0, 1, 0, 0)
          mapCanvas.toBlob(blob => {
            const reader = new FileReader()
            reader.addEventListener('loadend', async () => {
              const arrayBuffer = reader.result
              const pdfDoc = await PDFDocument.load(data)
              const page = pdfDoc.getPage(0)
              const pageWidth = page.getWidth()
              const pageHeight = page.getHeight()
              const pngImage = await pdfDoc.embedPng(arrayBuffer)
              const dx = Math.round((layout.map.x / layout.width) * pageWidth)
              const dy = Math.round((layout.map.y / layout.height) * pageHeight)
              const dWidth = Math.round((layout.map.width / layout.width) * pageWidth)
              const dHeight = Math.round((layout.map.height / layout.height) * pageHeight)
              page.drawImage(pngImage, {
                x: dx,
                y: pageHeight - (dy + dHeight),
                width: dWidth,
                height: dHeight,
              })
              const pdfBytes = await pdfDoc.save()
              resolve(new Blob([pdfBytes]))
            })
            reader.readAsArrayBuffer(blob)
          })
        })
        map.renderSync()
      })
    },
    async createPngWithOverlay () {
      const { screen, extent } = this.calculatePrintArea()
      const url = this.printRequest(extent, { format: 'png' })
      const img = new Image()
      img.src = url
      await img.decode()
      const printCanvas = document.createElement('canvas')
      printCanvas.width = img.naturalWidth
      printCanvas.height = img.naturalHeight

      const map = this.$map
      const layout = this.layout

      const dx = Math.round((layout.map.x / layout.width) * img.naturalWidth)
      const dy = Math.round((layout.map.y / layout.height) * img.naturalHeight)
      const dWidth = Math.round((layout.map.width / layout.width) * img.naturalWidth)
      const dHeight = Math.round((layout.map.height / layout.height) * img.naturalHeight)

      const ctx = printCanvas.getContext('2d')
      ctx.drawImage(img, 0, 0)
      return new Promise((resolve) => {
        map.once('rendercomplete', function () {
          const canvas = map.getViewport().querySelector('.ol-layer.measure canvas')
          if (canvas.width > 0) {
            const opacity = canvas.parentNode.style.opacity || canvas.style.opacity
            ctx.globalAlpha = opacity === '' ? 1 : Number(opacity)
            let matrix
            const transform = canvas.style.transform
            if (transform) {
              // Get the transform parameters from the style's transform matrix
              matrix = transform
                .match(/^matrix\(([^\(]*)\)$/)[1]
                .split(',')
                .map(Number)
            } else {
              matrix = [
                parseFloat(canvas.style.width) / canvas.width, 0, 0,
                parseFloat(canvas.style.height) / canvas.height, 0, 0
              ]
            }
            // Apply the transform to the export map context
            CanvasRenderingContext2D.prototype.setTransform.apply(ctx, matrix)
            ctx.drawImage(canvas, screen.x, screen.y, screen.width, screen.height, dx, dy, dWidth, dHeight)
          }
          ctx.globalAlpha = 1
          ctx.setTransform(1, 0, 0, 1, 0, 0)
          printCanvas.toBlob(resolve)
        })
        map.renderSync()
      })
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
