import clamp from 'lodash/clamp'
import debounce from 'lodash/debounce'
import { eventCoord, touchCenter, touchDistance, DragHandler } from '@/events'

export default {
  name: 'ImageViewer',
  props: {
    padding: [Array, Function],
    width: [String, Number],
    height: [String, Number],
    src: String,
    zoomLevels: {
      type: Array,
      default: () => [0.15, 0.25, 0.5, 0.75, 1, 1.5, 2, 3, 4]
    }
  },
  data () {
    return {
      animationActive: false,
      transformMatrix: [1, 0, 0, 1, 0, 0],
      viewBox: [1, 1]
    }
  },
  computed: {
    paddingValue () {
      if (Array.isArray(this.padding)) {
        return this.padding
      }
      return this.padding?.(this)
    },
    matrix () {
      return `matrix(${this.transformMatrix.join(' ')})`
    },
    cssMatrix () {
      return `matrix(${this.transformMatrix.join(',')})`
      // const [a, b, c, d, tx, ty] = this.transformMatrix
      // const matrix3d = [a, b, 0, 0, c, d, 0, 0, 0, 0, 1, 0, tx, ty, 0, 1]
      // return `matrix3d(${matrix3d.join(',')})`
    },
    zoom () {
      return this.transformMatrix[0]
    },
    labelsFontSize () {
      return 12 / this.zoom
    },
    overlayStyle () {
      return {
        transform: this.cssMatrix,
        fontSize: `${this.labelsFontSize}px`
      }
    },
    bounds () {
      if (this.image) {
        const w = this.image.width * this.zoom
        const h = this.image.height * this.zoom
        const bounds = this.canvasEl().getBoundingClientRect()

        const padding = this.paddingValue || [0, 0, 0, 0]
        // const padding = [12, 12, 52, 12]
        // const padding = [0, 0, 0, 0]

        const maxPanX = Math.max(0, (w - bounds.width) / 2)
        const maxPanY = Math.max(0, (h - bounds.height) / 2)
        const cx = (bounds.width - w) / 2
        const cy = (bounds.height - h) / 2
        return {
          xMin: cx - maxPanX - padding[1],
          xMax: cx + maxPanX + padding[3],
          yMin: cy - maxPanY - padding[2],
          yMax: cy + maxPanY + padding[0]
        }
      }
    }
  },
  watch: {
    // zoom (z) {
    //   this.$emit('zoom', z)
    // },
    zoom: {
      immediate: true,
      handler (z) {
        this.$emit('zoom', z)
      }
    },
    transformMatrix (m) {
      this.$emit('update:viewMatrix', m)
    }
  },
  mounted () {
    if (typeof ResizeObserver !== 'undefined') {
      let observer = new ResizeObserver(entries => {
        const entry = entries[0]
        const size = Array.isArray(entry.contentBoxSize) ? entry.contentBoxSize[0] : entry.contentBoxSize
        this.offAnimation()
        this.viewBox = [size.inlineSize, size.blockSize]
        if (this.image) {
          this.forceBounds()
        }
      })
      observer.observe(this.canvasEl())
      this.$once('hook:beforeDestroy', () => {
        observer.disconnect()
        observer = null
      })
    } else {
      this.offAnimation()
      const el = this.canvasEl()
      this.viewBox = [el.clientWidth, el.clientHeight]
    }
  },
  methods: {
    canvasEl () {
      return this.$el
    },
    transform (x, y) {
      const [a, b, c, d, e, f] = this.transformMatrix
      const x2 = a * x + c * y + e
      const y2 = b * x + d * y + f
      return [x2, y2]
    },
    calcZoomLevel (dir) {
      let z
      const index = this.zoomLevels.indexOf(this.zoom)
      if (index !== -1) {
        z = this.zoomLevels[index + (dir > 0 ? -1 : 1)]
      } else {
        let hIndex = this.zoomLevels.findIndex(v => v > this.zoom)
        if (hIndex === -1) {
          hIndex = this.zoomLevels.length
        }
        const lIndex = hIndex - 1
        z = this.zoomLevels[(dir > 0 ? lIndex : hIndex)]

        // const index = this.zoomLevels.findIndex(v => v > this.zoom)
        // if (index !== -1) {
        //   z = this.zoomLevels[index + (dir > 0 ? -1 : 0)]
        // } else if (dir > 0) {
        //   z = this.zoomLevels[this.zoomLevels.length - 1]
        // }
      }
      return z
    },
    zoomView (dir, e) {
      const z = this.calcZoomLevel(dir)
      if (z) {
        if (e) {
          const bounds = this.canvasEl().getBoundingClientRect()
          const offsetX = e.clientX - bounds.x
          const offsetY = e.clientY - bounds.y
          const cx = this.viewBox[0] * offsetX / bounds.width
          const cy = this.viewBox[1] * offsetY / bounds.height
          this.setZoom(z, cx, cy)
        } else {
          this.setZoom(z)
        }
      }
    },
    zoomIn (e) {
      this.zoomView(-1, e)
    },
    onMouseWheel: debounce(function (e) {
      this.zoomView(e.deltaY, e)
    }, 30),
    panHandler (e) {
      if (e.type === 'mousedown' && e.button > 1) {
        return
      }
      const origin = eventCoord(e)
      // const initialTransform = this.transformMatrix.slice()
      const panOrigin = [this.transformMatrix[4], this.transformMatrix[5]]
      let panStart, pinchCenter, pinchStartDistance, pinchStartScale
      const bounds = this.canvasEl().getBoundingClientRect()

      DragHandler(e, {
        onStart: () => {
          this.animationActive = false
        },
        onMove: e => {
          const [x, y] = eventCoord(e)
          const offsetX = (x - origin[0])
          const offsetY = (y - origin[1])

          const m = this.transformMatrix.slice()
          if (e.touches?.length > 1) {
            if (!pinchStartDistance) {
              pinchStartDistance = touchDistance(e)
              pinchStartScale = this.transformMatrix[0]
              pinchCenter = touchCenter(e)
              panStart = [this.transformMatrix[4], this.transformMatrix[5]]
            } else {
              const scale = touchDistance(e) / pinchStartDistance
              const [clientX, clientY] = touchCenter(e)
              const panX = clientX - pinchCenter[0]
              const panY = clientY - pinchCenter[1]

              const cx = this.viewBox[0] * (clientX - bounds.x) / bounds.width
              const cy = this.viewBox[1] * (clientY - bounds.y) / bounds.height

              m[4] = panStart[0] + panX
              m[5] = panStart[1] + panY
              m[0] = pinchStartScale * scale
              m[3] = pinchStartScale * scale
              m[4] = m[4] * scale + (1 - scale) * cx
              m[5] = m[5] * scale + (1 - scale) * cy
            }
          } else if (pinchStartDistance) {
            pinchStartDistance = null
          }
          if (!(e.touches?.length > 1)) {
            m[4] = panOrigin[0] + offsetX
            m[5] = panOrigin[1] + offsetY
          }
          this.transformMatrix = m
          this.forceBounds()
        },
        onEnd: () => {
          this.animationActive = true
        }
      })
    },
    resetView () {
      let scale = 1
      const [vw, vh] = this.viewBox
      let index = this.zoomLevels.indexOf(1)
      while (index > 0 && (this.image.width * scale > vw || this.image.height * scale > vh)) {
        index -= 1
        scale = this.zoomLevels[index]
      }
      // center horizontaly
      // this.transformMatrix = [scale, 0, 0, scale, (vw - this.image.width * scale) / 2, 0]
      this.transformMatrix = [scale, 0, 0, scale, (vw - this.image.width * scale) / 2, (vh - this.image.height * scale) / 2]
      this.forceBounds()
    },
    setZoom (z, x, y) {
      const scale = z / this.zoom
      if (x === undefined) {
        x = this.viewBox[0] / 2
        y = this.viewBox[1] / 2
      }
      const m = this.transformMatrix.slice()
      // for (let i = 0; i < m.length; i++) {
      //   m[i] *= scale
      // }
      // m[4] += (1 - scale) * x
      // m[5] += (1 - scale) * y

      m[0] *= scale
      m[3] *= scale
      m[4] = m[4] * scale + (1 - scale) * x
      m[5] = m[5] * scale + (1 - scale) * y

      this.transformMatrix = m
      this.forceBounds()
    },
    forceBounds () {
      if (this.bounds) {
        this.$set(this.transformMatrix, 4, clamp(this.transformMatrix[4], this.bounds.xMin, this.bounds.xMax))
        this.$set(this.transformMatrix, 5, clamp(this.transformMatrix[5], this.bounds.yMin, this.bounds.yMax))
      }
    },
    offAnimation () {
      this.animationActive = false
      if (this._offTimer) {
        clearTimeout(this._offTimer)
      }
      this._offTimer = setTimeout(() => {
        this.animationActive = true
        this._offTimer = null
      }, 500)

      // this.$nextTick(() => {
      //   requestAnimationFrame(() => {
      //     console.log('animationActive:true')
      //     this.animationActive = true
      //   })
      // })
    }
  }
}
