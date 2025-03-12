<template>
  <div>
    <portal to="main-panel">
      <div class="print-form f-col light" key="print">
        <div class="f-row">
          <v-select
            class="flat f-grow"
            :label="tr.Layout"
            v-model="layout"
            :placeholder="tr.Layout"
            item-text="name"
            item-value=""
            :items="layouts"
          />
        </div>

        <collapse-transition>
          <form v-if="layout">
            <switch-transition>
              <div class="f-col" :key="layout.name">
                <v-text-field
                  v-for="label in visibleLabels"
                  :key="label"
                  class="flat"
                  :placeholder="label"
                  :name="label"
                  :label="label"
                  v-model="labelsData[layout.name][label]"
                />
              </div>
            </switch-transition>
          </form>
        </collapse-transition>
        <div class="group-label f-row-ac">
          <hr class="f-grow mx-2"/>
          <translate>Additional content</translate>
          <hr class="f-grow mx-2"/>
        </div>
        <div class="options f-col mb-2">
          <v-checkbox
            :label="tr.Measurements"
            :disabled="!measurements"
            :value="measurements ? options.measurements : false"
            @input="options.measurements = $event"
          />
          <div class="f-row-ac">
            <v-checkbox
              class="f-grow"
              :label="tr.Text"
              v-model="options.text"
              @input="v => v && $refs.htmlContent.show()"
            />
            <v-btn
              class="icon"
              @click="[editorHtml = htmlContent, $refs.htmlContent.show()]"
            >
              <v-icon name="text-edit"/>
            </v-btn>
          </div>
          <v-checkbox
            :label="tr.Legend"
            v-model="options.legend"
          />
          <div class="f-row-ac">
            <v-checkbox
              class="f-grow"
              :label="tr.InfoPanel"
              :disabled="!infoPanel"
              :value="infoPanel ? options.infoPanel : false"
              @input="options.infoPanel = $event"
            />
            <v-btn
              v-if="infoPanel"
              class="icon flat"
              :color="infoPanelHidden ? 'primary' : ''"
              @click="infoPanelHidden = !infoPanelHidden"
            >
              <v-icon name="visibility_off"/>
            </v-btn>
          </div>
        </div>
        <div class="toolbar f-row">
          <v-select
            class="filled inline"
            label="DPI"
            :items="[96, 150, 300]"
            v-model="dpi"
          />
          <div class="f-grow"/>
          <v-btn
            class="icon"
            :disabled="showProgressbar"
            @click="print()"
          >
            <v-icon name="printer"/>
          </v-btn>
          <v-btn
            class="icon"
            :disabled="showProgressbar"
            @click="download('pdf')"
          >
            <v-icon name="download"/>
            <v-tooltip slot="tooltip" align="c;tt,bb">
              <translate>Download PDF file</translate>
            </v-tooltip>
          </v-btn>
          <v-btn
            class="icon"
            :disabled="showProgressbar"
            @click="download('png')"
          >
            <v-icon name="photo"/>
            <v-tooltip slot="tooltip" align="c;tt,bb">
              <translate>Download PNG image</translate>
            </v-tooltip>
          </v-btn>
        </div>
      </div>
    </portal>
    <portal to="map-overlay">
      <print-preview
        v-if="layout && showPreview"
        ref="preview"
        :layout="layout"
        :dpi="dpi"
        :show-progressbar="showProgressbar"
        @download="download"
        @print="print"
        @close="$emit('close')"
      />
      <div v-if="infoPanel && options.infoPanel && !infoPanelHidden" class="infopanel f-col shadow-2">
        <div class="toolbar dark f-row-ac">
          <span class="title f-grow mx-2">Info Panel</span>
          <v-btn
            class="icon flat minimize"
            @click="infoPanelCollapsed = !infoPanelCollapsed"
          >
            <v-icon name="arrow-down" :class="{collapsed: infoPanelCollapsed}"/>
          </v-btn>
          <v-btn @click="infoPanelHidden = true" class="icon flat">
            <v-icon name="x"/>
          </v-btn>
        </div>
        <collapse-transition class="collapse-container">
          <div v-show="!infoPanelCollapsed" class="wrapper">
            <scroll-area>
              <component
                class="print"
                :is="infoPanel.component"
                v-bind="infoPanel.props"
              />
            </scroll-area>
          </div>
        </collapse-transition>
      </div>
    </portal>
    <features-viewer v-if="infoPanel" class-name="ol-layer infopanel" :features="mapFeatures"/>
    <v-dialog ref="htmlContent" :title="tr.Text" persistent>
      <template v-slot="{ close }">
        <div class="dialog-content f-col">
          <text-editor class="filled f-grow" :override-font="false" v-model="editorHtml"/>
          <div class="editor-toolbar f-row-ac">
            <v-btn color="dark" @click="close">
              <translate>Cancel</translate>
            </v-btn>
            <v-btn color="primary" @click="[htmlContent = editorHtml, close()]">
              <translate>Ok</translate>
            </v-btn>
          </div>
        </div>
      </template>
    </v-dialog>
  </div>
</template>

<script>
import { mapState, mapGetters } from 'vuex'
import axios from 'axios'
import combineURLs from 'axios/lib/helpers/combineURLs'
import FileSaver from 'file-saver'

import PrintPreview from './Preview.vue'
import FeaturesViewer from '@/components/ol/FeaturesViewer.vue'
import { createPrintParameters, formatCopyrights } from './utils'
import { getLegendImage, domToSvg, findSplitPositions } from '@/export/pdf'
import { getWmsLegendUrl } from '@/map/wms'

let state = null

const HtmlView = {
  functional: true,
  props: {
    value: String
  },
  render (h, ctx) {
    return <span {...ctx.data} domPropsInnerHTML={ctx.props.value}></span>
  }
}

function getLayerLegendUrl (layer, source, view, dpi) {
  if (layer.legend_url) {
    return layer.legend_url
  }
  if (layer.provider_type === 'wms') {
    return getWmsLegendUrl(layer)
  }
  const opts = dpi ? { DPI: dpi } : null
  return source.getLegendUrl(layer.name, view, opts)
}

export default {
  name: 'print',
  components: {
    HtmlView,
    PrintPreview, FeaturesViewer,
    TextEditor: () => import(/* webpackChunkName: "text-editor" */ '@/ui/TextEditor.vue')
   },
  props: {
    measurements: Boolean,
    infoPanel: Object
  },
  data: () => state || ({
    layout: null,
    format: 'pdf',
    dpi: 150,
    labelsData: null,
    showPreview: false,
    showProgressbar: false,
    options: {
      legend: false,
      measurements: true,
      infoPanel: true,
      text: false
    },
    infoPanelCollapsed: false,
    infoPanelHidden: false,
    htmlContent: '',
    editorHtml: ''
  }),
  computed: {
    ...mapState(['project']),
    ...mapGetters(['visibleBaseLayer', 'visibleLayers']),
    tr () {
      return {
        Menu: this.$gettext('Menu'),
        Layout: this.$gettext('Layout'),
        Legend: this.$gettext('Legend'),
        Measurements: this.$gettext('Measurements'),
        InfoPanel: this.$gettext('Info Panel'),
        Text: this.$gettext('Text')
      }
    },
    formatOptions () {
      return [{
        text: 'PDF',
        value: 'pdf'
      }, {
        text: 'PNG',
        value: 'png'
      }]
    },
    formatMenuItems () {
      const action = i => {
        this.format = i.value
      }
      return ['pdf', 'png'].map(value => ({
        value,
        text: value,
        checked: this.format === value,
        action
      }))
    },
    qualityMenuItems () {
      const action = i => {
        this.dpi = i.value
      }
      return [96, 150, 300].map(value => ({
        value,
        text: `${value} dpi`,
        checked: this.dpi === value,
        action
      }))
    },
    menuItems () {
      return [
        { text: this.$gettext('Output format'), separator: true },
        ...this.formatMenuItems,
        { text: this.$gettext('Print quality'), separator: true },
        ...this.qualityMenuItems
      ]
    },
    layouts () {
      return this.project.config.print_composers
    },
    visibleLabels () {
      if (this.layout) {
        return this.layout.labels.filter(label => !label.startsWith('gislab_'))
      }
      return []
    },
    mapFeatures () {
      if (this.infoPanel) {
        return [this.infoPanel.props.feature]
      }
      return null
    }
  },
  created () {
    this.showPreview = false
    // wait some time before showing preview to avoid possible resizing during closing of previous tool
    setTimeout(() => {
      this.showPreview = true
    }, 500)
    if (!this.labelsData) {
      // initialize data for all labels
      const labelsdata = {}
      this.layouts.forEach(layout => {
        labelsdata[layout.name] = {}
        layout.labels
          .filter(label => !label.startsWith('gislab_'))
          .forEach(label => {
            labelsdata[layout.name][label] = ''
          })
      })
      this.labelsData = labelsdata
    }
    this.layout = this.layout || this.layouts[0]
  },
  mounted () {
    this.activate()
  },
  activated () {
    this.activate()
  },
  beforeDestroy () {
    this.deactivate()
    state = this.$data
  },
  deactivated () {
    this.deactivate()
  },
  methods: {
    activate () {
      this.$root.$panel.setStatusBarVisible(false)
    },
    deactivate () {
      this.$root.$panel.setStatusBarVisible(true)
    },
    printRequest (extent, opts) {
      const map = this.$map
      const layers = []
      const opacities = []
      if (this.visibleBaseLayer?.name) {
        const opacity = map.getLayers().getArray().find(l => l.get('name') === this.visibleBaseLayer.name)?.getOpacity() ?? 1
        if (opacity > 0) {
          layers.push(this.visibleBaseLayer.name)
          opacities.push(Math.round(opacity * 255))
        }
      }
      const overlayLayers = map.overlay.getSource().getVisibleLayers()
      layers.push(...overlayLayers)
      const globalOpacity = map.overlay.getOpacity()
      const overlaysOpacities = map.overlay.getSource().opacities
      opacities.push(...overlayLayers.map(name => Math.round(globalOpacity * (overlaysOpacities[name] ?? 255))))

      const config = {
        dpi: this.dpi,
        // format: this.format,
        layers,
        opacities,
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
    async createPngWithOverlays (url, cfg, overlays) {
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
          overlays.forEach(canvas => {
            const opacity = canvas.parentNode.style.opacity || canvas.style.opacity
            ctx.globalAlpha = opacity === '' ? 1 : Number(opacity)
            const srcBounds = {
              x: Math.round(cfg.relative.x * canvas.width),
              y: Math.round(cfg.relative.y * canvas.height),
              width: Math.round(cfg.relative.width * canvas.width),
              height: Math.round(cfg.relative.height * canvas.height)
            }
            ctx.drawImage(canvas, srcBounds.x, srcBounds.y, srcBounds.width, srcBounds.height, dx, dy, dWidth, dHeight)
          })
          ctx.globalAlpha = 1
          printCanvas.toBlob(resolve)
        })
        map.renderSync()
      })
    },
    async addMapOverlays (pdfDoc, canvases, area) {
      const canvas = canvases[0]
      const srcBounds = {
        x: Math.round(area.x * canvas.width),
        y: Math.round(area.y * canvas.height),
        width: Math.round(area.width * canvas.width),
        height: Math.round(area.height * canvas.height)
      }
      const mapCanvas = document.createElement('canvas')
      mapCanvas.width = srcBounds.width
      mapCanvas.height = srcBounds.height
      const ctx = mapCanvas.getContext('2d')
      const layout = this.layout

      await new Promise(resolve => {
        this.$map.once('rendercomplete', async function () {
          canvases.forEach(canvas => {
            const opacity = canvas.parentNode.style.opacity || canvas.style.opacity
            ctx.globalAlpha = opacity === '' ? 1 : Number(opacity)
            ctx.drawImage(canvas, srcBounds.x, srcBounds.y, srcBounds.width, srcBounds.height, 0, 0, srcBounds.width, srcBounds.height)
          })

          ctx.globalAlpha = 1
          mapCanvas.toBlob(blob => {
            const reader = new FileReader()
            reader.addEventListener('loadend', async () => {
              const arrayBuffer = reader.result
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
              resolve()
            })
            reader.readAsArrayBuffer(blob)
          })
        })
        this.$map.renderSync()
      })
    },
    async appendPdfLegend (pdfDoc, pageOffset = 0) {
      let page = pdfDoc.getPage(pdfDoc.getPageCount() - 1)
      const pageWidth = page.getWidth()
      const pageHeight = page.getHeight()
      // let page = pdfDoc.addPage([pageWidth, pageHeight])

      const source = this.$map.overlay.getSource()
      const view = this.$map.getView()
      const urls = this.visibleLayers.map(l => getLayerLegendUrl(l, source, view, this.dpi))

      const margin = { top: 15, left: 15, bottom: 15, right: 15 }
      if (!pageOffset || pageOffset > 0.9 * (pageHeight - margin.top - margin.bottom)) {
        page = pdfDoc.addPage([pageWidth, pageHeight])
        pageOffset = margin.top
      }
      let pageStartY = Math.max(pageOffset, margin.top)
      let legendEndY = pageStartY

      let t = pageHeight - pageStartY
      let left = margin.left
      let columnWidth = 0

      for (const imgUrl of urls) {
        let scale = this.dpi / 64
        const img = new Image()
        if (!imgUrl.startsWith(location.origin)) {
          img.crossOrigin = 'anonymous'
          scale = 1.5
        }
        img.src = imgUrl
        try {
          await img.decode()
        } catch (err) {
          console.error(err)
          continue
        }
        const imgWidth = img.width / scale
        columnWidth = Math.max(columnWidth, imgWidth)
        let imgOffset = 0
        if (left > margin.left && imgWidth > pageWidth - left - margin.right) {
          page = pdfDoc.addPage([pageWidth, pageHeight])
          left = margin.left
          pageStartY = margin.top
          legendEndY = pageStartY
          t = pageHeight - pageStartY
        }
        while (imgOffset < img.height) {
          let imgData = await getLegendImage(img, (t - margin.bottom) * scale, imgOffset)
          if (!imgData) {
            // go to the new column or page
            left += columnWidth + 20
            if (imgWidth > pageWidth - left - margin.right) {
              page = pdfDoc.addPage([pageWidth, pageHeight])
              left = margin.left
              pageStartY = margin.top
              legendEndY = pageStartY
            }
            t = pageHeight - pageStartY
            imgData = await getLegendImage(img, (t - margin.bottom) * scale, imgOffset)
            if (!imgData) {
              console.error('cannot split legend image!')
              page = pdfDoc.addPage([pageWidth, pageHeight])
              left = margin.left
              pageStartY = margin.top
              legendEndY = pageStartY
              t = pageHeight - pageStartY
              imgData = await getLegendImage(img, (t - margin.bottom) * scale, imgOffset)
              if (!imgData) {
                console.error('cannot split legend image, skipping!')
                break
              }
            }
          }
          const image = await pdfDoc.embedPng(imgData.data.uint8Array)
          t -= imgData.height / scale
          page.drawImage(image, {
            x: left,
            y: Math.round(t),
            width: imgData.width / scale,
            height: imgData.height / scale
          })
          legendEndY = Math.max(legendEndY, pageHeight - t)
          imgOffset += imgData.height
        }
      }
      return legendEndY
    },
    async getPrintOutput (format, config) {
      const url = this.printRequest(config.extent, { format })
      const drawMeasurements = this.measurements && this.options.measurements
      const drawInfoPanel = this.infoPanel && this.options.infoPanel
      let overlays
      if (drawMeasurements || drawInfoPanel) {
        const classes = []
        if (drawMeasurements) {
          classes.push('.ol-layer.measure canvas')
        }
        if (drawInfoPanel) {
          classes.push('.ol-layer.infopanel canvas')
        }
        overlays = this.$map.getViewport().querySelectorAll(classes.join(', '))
        overlays = Array.from(overlays).filter(canvas => canvas.width > 0)
      }

      this.showProgressbar = true
      document.body.style.cursor = 'wait'
      let data
      try {
        if (format === 'png' && overlays?.length) {
          data = await this.createPngWithOverlays(url, config, overlays)
        } else {
          const extendPdf = format === 'pdf' && (overlays?.length || this.options.legend || this.htmlContent)
          const responseType = extendPdf ? 'arraybuffer' : 'blob'

          ;({ data } = await this.$http.get(url, { responseType }))
          if (extendPdf) {
            const PDFDocument = (await import(/* webpackChunkName: "pdf-lib" */'@/export/pdf-lib')).PDFDocument
            const pdfDoc = await PDFDocument.load(data)
            const margin = { top: 15, left: 15, bottom: 15, right: 15 }
            const extend = async (component, props, pageOffset) => {
              let page = pdfDoc.getPage(pdfDoc.getPageCount() - 1)
              pageOffset = Math.max(pageOffset, margin.top)
              if (pageOffset > 0.9 * (page.getHeight() - margin.top - margin.bottom)) {
                page = pdfDoc.addPage([page.getWidth(), page.getHeight()])
                pageOffset = margin.top
              }

              const splitContent = (domEl) => {
                let availableHeight = 1.33 * (page.getHeight() - pageOffset - margin.bottom)
                const fullPageHeight = 1.33 * (page.getHeight() - margin.top - margin.bottom)

                const contentHeight = domEl.offsetHeight
                if (contentHeight <= availableHeight) {
                  // no need to split
                  return [{ start: 0, height: contentHeight }]
                }

                const nextSplit = findSplitPositions(domEl)
                const segments = []
                let lastSplit = 0
                let splitY = nextSplit(availableHeight, lastSplit)
                if (splitY === null) {
                  // try full page height
                  splitY = nextSplit(fullPageHeight, lastSplit)
                  if (splitY === null) {
                    throw new Error('unable to split content')
                  }
                  // segments.push({ start: 0, height: splitY, newPage: true })
                }
                while (splitY !== null && contentHeight - splitY > fullPageHeight) {
                  segments.push({
                    start: lastSplit,
                    end: splitY,
                    height: splitY - lastSplit
                  })
                  lastSplit = splitY
                  splitY = nextSplit(fullPageHeight, lastSplit)
                }
                segments.push({ start: lastSplit, height: splitY - lastSplit })
                if (contentHeight - splitY > 0) {
                  segments.push({ start: splitY, height: contentHeight - splitY })
                }
                if (segments[0].height > availableHeight) {
                  segments[0].breakPage = true
                }
                return segments
              }

              const pageSize = { width: page.getWidth(), height: page.getHeight() }
              const [svgs, segments] = await domToSvg(component, props, 1.33 * (page.getWidth() - 30), 1.33 * (page.getHeight() - 30), splitContent)
              for (let i = 0; i < svgs.length; i++) {
                const svg = svgs[i]
                const segment = segments[i]
                const f = new FormData()
                f.append('svg', new Blob([svg], { type: 'image/svg+xml' }))
                // const resp = await this.$http.post('/api/services/pdf/convert', f, { responseType: 'blob' })
                // FileSaver.saveAs(resp.data, 'test.pdf')

                const { data } = await this.$http.post('/api/services/pdf/convert', f, { responseType: 'arraybuffer' })
                const [embeddedPage] = await pdfDoc.embedPdf(data, [0])

                if (i > 0 || segment.breakPage) {
                  page = pdfDoc.addPage([pageSize.width, pageSize.height])
                  pageOffset = margin.top
                }
                const y = pageSize.height - embeddedPage.height - pageOffset
                page.drawPage(embeddedPage, {
                  x: margin.left,
                  y: y
                })
                pageOffset += embeddedPage.height
              }
              return pageOffset
            }
            if (overlays?.length) {
              await this.addMapOverlays(pdfDoc, overlays, config.relative)
            }
            const page = pdfDoc.getPage(pdfDoc.getPageCount() - 1)
            let pageOffset = page.getHeight()

            if (this.options.text && this.htmlContent) {
              pageOffset = await extend(HtmlView, { value: this.htmlContent }, pageOffset)

              // for debugging
              // const lastPage = pdfDoc.getPage(pdfDoc.getPageCount() - 1)
              // lastPage.drawLine({
              //   start: { x: 0, y: lastPage.getHeight() - pageOffset },
              //   end: { x: margin.left, y: lastPage.getHeight() - pageOffset },
              //   thickness: 2,
              //   color: { type: 'RGB', red: 0, green: 1, blue: 0 },
              //   opacity: 0.75,
              // })
              pageOffset += 10
            }
            if (this.options.legend) {
              pageOffset = await this.appendPdfLegend(pdfDoc, pageOffset)
              // for debugging
              // const lastPage = pdfDoc.getPage(pdfDoc.getPageCount() - 1)
              // lastPage.drawLine({
              //   start: { x: 0, y: lastPage.getHeight() - pageOffset },
              //   end: { x: margin.left, y: lastPage.getHeight() - pageOffset },
              //   thickness: 2,
              //   color: { type: 'RGB', red: 1, green: 0, blue: 0 },
              //   opacity: 0.75,
              // })
              pageOffset += 10
            }

            if (drawInfoPanel) {
              const { component, props } = this.infoPanel
              await extend(component, props, pageOffset)
            }
            const bytes = await pdfDoc.save()
            data = new Blob([bytes], { type: 'application/pdf' })
          }
        }
      } catch (err) {
        console.error(err)
        // TODO: show error notification
      } finally {
        this.showProgressbar = false
        document.body.style.cursor = ''
      }
      return data
    },
    async download (format, config) {
      if (!config) {
        config = this.$refs.preview.calculatePrintArea()
      }
      const data = await this.getPrintOutput(format, config)
      const timeString = new Date().toISOString()
      const timeStamp = timeString.substring(11, 19).split(':').join('-')
      const filename = `${this.layout.name}_${timeStamp}.${format}`
      FileSaver.saveAs(data, filename)
    },
    async print (config) {
      if (!config) {
        config = this.$refs.preview.calculatePrintArea()
      }
      const blob = await this.getPrintOutput('pdf', config)
      const url = URL.createObjectURL(blob)
      setTimeout(() => URL.revokeObjectURL(url), 30000)
      window.open(url, '_blank')
    }
  }
}
</script>

<style lang="scss" scoped>
.print-form {
  .menu {
    .btn {
      margin: 4px;
    }
  }
  .group-label {
    font-size: 12px;
    opacity: 0.7;
  }
  .options {
    --gutter: 2px 6px;
    font-size: 15px;
  }
  .toolbar {
    background-color: #f3f3f3;
    border-top: 1px solid #ddd;
    align-items: flex-end;
    flex-shrink: 0;
    --gutter: 3px 6px;
    .select {
      height: 28px;
      ::v-deep .input {
        height: 28px;
      }
    }
    .btn {
      --gutter: 3px 4px;
      padding: 3px;
    }
    padding-bottom: 1px;
    margin-bottom: 1px;
  }
}
.collapse-container:not(.collapse-enter-active) {
  overflow: hidden;
  display: grid;
  > .wrapper {
    overflow: hidden;
    display: grid;
  }
}
.infopanel {
  pointer-events: auto;
  background-color: #eee;
  border-radius: 3px;
  border: 1px solid #aaa;
  .toolbar {
    flex-shrink: 0;
    background-color: #444;
    height: 28px;
    line-height: 1;
    --fill-color: transparent;
    .title {
      font-size: 14px;
      font-weight: 500;
    }
    .i-field ::v-deep .input {
      height: 28px;
    }
    .minimize.btn {
      .icon {
        transition: transform .4s cubic-bezier(.25,.8,.25,1);
        &:not(.collapsed) {
          transform: rotate(180deg);
        }
      }
    }
  }
  position: absolute;
  right: 6px;
  top: 48px;
  max-width: 500px;
  min-width: 300px;
  max-height: calc(100% - 60px);
  overflow: hidden;
}
.dialog-content {
  max-height: 90vh;
  overflow: auto;
  .text-editor {
    ::v-deep .input {
      resize: both!important;
      width: 70vw;
      height: 50vh;
      max-height: calc(100vh - 200px);
    }
  }
  .editor-toolbar {
    font-size: 14px;
    justify-content: flex-end;
    .btn:not(.icon) {
      min-width: 100px;
      height: 30px;
      --gutter: 0 6px 6px 6px;
    }
  }
}
</style>
