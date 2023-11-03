<template>
  <div class="image-editor">
    <div
      ref="canvas"
      class="canvas"
      :class="{'animation-active': animationActive}"
      @mousewheel.prevent="onMouseWheel"
      @mousedown="panHandler"
      @touchstart="panHandler"
      @dblclick="zoomIn"
    >
      <div
        class="html-layer"
        :style="overlayStyle"
        @mousewheel.prevent="onMouseWheel"
      >
        <img v-if="image" :src="image.src"/>
        <!-- <div class="crop-handler vert" :style="cropLine1"/> -->
      </div>

      <!-- SVG Canvas -->
      <svg
        class="svg-canvas"
        preserveAspectRatio="none"
        :viewBox="`0 0 ${viewBox[0]} ${viewBox[1]}`"
      >
        <g
          v-if="crop && image"
          class="view"
          :transform="matrix"
          :font-size="labelsFontSize"
        >
          <path class="crop-mask" :d="cropMask"/>
          <g
            v-for="(l, i) in cropLines"
            :key="`e-${i}`"
            class="crop-group"
            :class="l.type"
            @mousedown.stop="cropHandler($event, ...l.edges)"
            @touchstart.stop="cropHandler($event, ...l.edges)"
          >
            <path class="crop-line-handler" :d="l.path"/>
            <path class="crop-line" :d="l.path"/>
          </g>

          <circle
            v-for="(p, i) in cropPoints"
            :key="`p-${i}`"
            class="crop-point"
            :class="p.type"
            :cx="p.x"
            :cy="p.y"
            :r="10 / zoom"
            @mousedown.stop="cropHandler($event, ...p.edges)"
            @touchstart.stop="cropHandler($event, ...p.edges)"
          />
        </g>
      </svg>
    </div>
    <slot name="append" :editor="this"/>

    <!-- <div v-if="cropSrc" class="crop-preview">
      <img :src="cropSrc"/>
    </div> -->
  </div>
</template>

<script lang="js">
import clamp from 'lodash/clamp'
import { eventCoord, DragHandler } from '@/events'
import ImageViewer from './BaseImageViewer'

export function resizeImage (img, format, scale, quality) {
  const width = Math.round(img.naturalWidth * scale)
  const height = Math.round(img.naturalHeight * scale)
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  ctx.drawImage(img, 0, 0, width, height)

  // If support for quality parameter in canvas.toBlob would be an issue,
  // it should be possible to use canvas.toDataURL with dataURLToBlob function
  // from https://stackoverflow.com/a/24015367
  // const url = canvas.toDataURL(format, quality)

  return new Promise(resolve => {
    canvas.toBlob(data => resolve({ data, width, height }), format, quality)
  })
}

export function cropImage (img, format, scale, quality, crop) {
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')
  const sx = crop.left * img.naturalWidth
  const sy = crop.top * img.naturalHeight
  const sw = crop.right * img.naturalWidth - sx
  const sh = crop.bottom * img.naturalHeight - sy

  const width = Math.round(sw * scale)
  const height = Math.round(sh * scale)
  canvas.width = width
  canvas.height = height
  ctx.drawImage(img, sx, sy, sw, sh, 0, 0, width, height)
  return new Promise(resolve => {
    canvas.toBlob(data => resolve({ data, width, height }), format, quality)
  })
}

export default {
  extends: ImageViewer,
  name: 'ImageEditor',
  props: {
    crop: Object,
    format: String,
    scale: {
      type: Number,
      default: 1
    },
    quality: {
      type: Number
    }
  },
  data () {
    return {
      cropEditArea: null,
      cropSrc: null,
      image: null,
      inputImage: null
    }
  },
  computed: {
    cropRect () {
      if (!this.crop || !this.image) {
        return
      }
      if (this.cropEditArea) {
        return this.cropEditArea
      }
      const { width: w, height: h } = this.image
      const { left, top, right, bottom } = this.crop
      return {
        left: left * w,
        top: top * h,
        right: right * w,
        bottom: bottom * h
      }
    },
    cropMask () {
      const { width: w, height: h } = this.image
      const { left, top, right, bottom } = this.cropRect
      const outer = `M0,0 V${h} H${w} V0 z`
      const inner = `M ${left},${top} H${right} V${bottom} H ${left} z`
      return outer + inner
    },
    cropLines () {
      const { left, top, right, bottom } = this.cropRect
      return [
        {
          type: 'horizontal',
          path: `M ${left},${top} H ${right}`,
          edges: [1, 0, 0, 0] // top
        }, {
          type: 'vertical',
          path: `M ${right},${top} V ${bottom}`,
          edges: [0, 1, 0, 0] // right
        }, {
          type: 'horizontal',
          path: `M ${left},${bottom} H ${right}`,
          edges: [0, 0, 1, 0] // bottom
        }, {
          type: 'vertical',
          path: `M ${left},${top} V ${bottom}`,
          edges: [0, 0, 0, 1] // left
        }
      ]
    },
    cropPoints () {
      const { left, top, right, bottom } = this.cropRect
      return [
        { x: left, y: top, edges: [1, 0, 0, 1], type: 'top-left' },
        { x: right, y: top, edges: [1, 1, 0, 0], type: 'top-right' },
        { x: right, y: bottom, edges: [0, 1, 1, 0], type: 'bottom-right' },
        { x: left, y: bottom, edges: [0, 0, 1, 1], type: 'bottom-left' }
      ]
    },
    cropLine1 () {
      const { left, top, right, bottom } = this.cropRect
      return {
        left: (left) + 'px',
        top: top + 'px',
        height: (bottom - top) + 'px',
        // width: '4px'
      }
    }
  },
  watch: {
    src: {
      immediate: true,
      async handler (src) {
        if (src) {
          const img = new Image()
          img.src = src
          await img.decode()
          this.inputImage = Object.freeze({
            img,
            src,
            width: img.naturalWidth,
            height: img.naturalHeight
          })
        } else {
          this.inputImage = null
        }
      }
    },
    image (_, old) {
      old?.free?.()
    }
  },
  async created () {
    this.$watch(vm => [vm.inputImage, vm.scale, vm.quality, vm.format], async (params, old) => {
      const [ image, scale, quality, format ] = params
      if (!image) return

      // this.animationActive = false
      // if (Number.isFinite(scale) && Number.isFinite(quality))
      if (scale && quality) {
        const { data, width, height } = await resizeImage(image.img, format, scale, quality)
        const src = URL.createObjectURL(data)
        const img = new Image()
        img.src = src
        await img.decode()
        this.image = {
          img,
          data,
          src,
          width,
          height,
          free () {
            URL.revokeObjectURL(this.src)
          }
        }
        if (scale !== old[1]) {
          // console.log('width change', width, old[0].width, width / old[0].width)
          const scaleChange = scale / old[1]
          this.offAnimation()
          this.$set(this.transformMatrix, 0, this.transformMatrix[0] / scaleChange)
          this.$set(this.transformMatrix, 3, this.transformMatrix[3] / scaleChange)
        }
      } else {
        this.image = image
      }
      if (image !== old[0]) {
        this.offAnimation()
        this.resetView()
      }
      // setTimeout(() => {
      //   this.animationActive = true
      // }, 60)
    }, { immediate: true })
    this.$watch(vm => [vm.image, vm.crop], async (params) => {
      const [ image, crop ] = params
      if (image && crop) {
        this.cropImage()
      } else {
        this.$emit('update:image', image)
      }
    })
  },
  methods: {
    canvasEl () {
      return this.$refs.canvas
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
    cropHandler (e, t, r, b, l) {
      const originCrop = { ...this.cropRect }
      const [ originX, originY ] = eventCoord(e)
      DragHandler(e, {
        onStart: () => {
          this.cropEditArea = { ...this.cropRect }
        },
        onMove: e => {
          const [ x, y ] = eventCoord(e)
          const offsetX = x - originX
          const offsetY = y - originY
          if (l) {
            this.cropEditArea.left = clamp(originCrop.left + offsetX / this.zoom, 0, originCrop.right)
          }
          if (r) {
            this.cropEditArea.right = clamp(originCrop.right + offsetX / this.zoom, originCrop.left, this.image.width)
          }
          if (t) {
            this.cropEditArea.top = clamp(originCrop.top + offsetY / this.zoom, 0, originCrop.bottom)
          }
          if (b) {
            this.cropEditArea.bottom = clamp(originCrop.bottom + offsetY / this.zoom, originCrop.top, this.image.height)
          }
        },
        onEnd: () => {
          const { width, height } = this.image
          const { left, top, right, bottom } = this.cropEditArea
          const cropValue = {
            left: left / width,
            top: top / height,
            right: right / width,
            bottom: bottom / height
          }
          this.$emit('update:crop', cropValue)
          this.cropEditArea = null
        }
      })
    },
    async cropImage () {
      const res = await cropImage(this.inputImage.img, this.format, this.scale, this.quality, this.crop)
      this.$emit('update:image', res)

      // cropSrc is only for debugging
      // if (this.cropSrc) {
      //   URL.revokeObjectURL(this.cropSrc)
      // }
      // this.cropSrc = URL.createObjectURL(res.data)
    }
  }
}
</script>

<style lang="scss" scoped>
.canvas {
  display: grid;
  position: relative;
  overflow: hidden;
  > * {
    grid-area: 1 / 1 / 2 / 2;
  }
  .html-layer {
    transform-origin: 0 0;
    position: absolute;
    inset: 0;
    pointer-events: none;
  }
  &.animation-active {
    .view, .html-layer {
      transition: 0.25s ease;
      // will-change: transform;
      will-change: font-size;
      // will-change: transform, font-size;
    }
  }

  .svg-canvas {
    position: absolute;
    user-select: none;
    width: 100%;
    height: 100%;
    touch-action: none;
  }
}
.crop-mask {
  fill: #000;
  fill-opacity: 0.6;
}
.crop-group {
  touch-action: none;
  .crop-line {
    // stroke: var(--color-red);
    stroke: #fff;
    stroke-width: 0.25em;
  }
  .crop-line-handler {
    stroke-width: 2em;
    stroke: rgba(#000, 0.01);
  }
  &:hover {
    &.horizontal {
      cursor: ns-resize;
    }
    &.vertical {
      cursor: ew-resize;
    }
    .crop-line {
      // stroke: var(--color-primary);
    }
  }
}
.crop-point {
  // fill: var(--color-orange);
  fill: #ddd;
  fill: #fff;
  stroke: #fff;
  stroke-width: 0.15em;
  // &:hover {
  //   fill: var(--color-primary);
  // }
  &.top-left, &.bottom-right {
    cursor: nwse-resize;
  }
  &.top-right, &.bottom-left {
    cursor: nesw-resize;
  }
}
// .crop::after {
//   content: "";
//   position: absolute;
//   inset: 0;
//   background-color: teal;
//   // clip-path: circle(500px at 0% 0%);
//   // clip-path: inset(100px);
// }

.crop-handler {
  display: none;
  position: absolute;
  // pointer-events: auto;
  &.vert {
    padding: 0 .5em;
    border-left: 0.25em solid var(--color-red);
  }
  &:hover {
    border-color: var(--color-primary);
  }
}

.crop-preview {
  background-color: #333;
  img {
    max-width: 200px;
    max-height: 300px;
  }
}
</style>
