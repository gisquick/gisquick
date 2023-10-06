<template>
  <div class="image-input" :class="{empty}">
    <template v-if="newImage">
      <v-image class="preview" :src="newImage.src"/>
      <div class="detail new f-col">
        <div class="toolbox f-row-ac f-justify-end">
          <v-btn class="icon small" @click="openEditor(newImage)">
            <v-icon name="tune"/>
          </v-btn>
          <v-btn class="icon small" @click="resetImage">
            <v-icon name="x"/>
          </v-btn>
        </div>
        <div class="mx-2">
          <translate class="label">Format</translate>
          <span v-text="newImageInfo.format"/>
        </div>
        <div class="mx-2">
          <translate class="label">Size</translate>
          <span v-text="newImageInfo.filesize"/>
        </div>
        <div class="mx-2">
          <translate class="label">Resolution</translate>
          <span v-text="newImageInfo.resolution"/>
        </div>
        <p v-if="resizeRequired" class="notification mx-2">
          <v-icon name="circle-i-outline" size="16" color="orange"/>
          <translate>Image will be saved in lower resolution</translate>
        </p>
      </div>
    </template>
    <template v-else-if="value">
      <v-image
        class="preview"
        :src="valueUrl"
        :xsrcset="`${valueUrl}?width=400 400w, ${valueUrl}?width=1200 1200w`"
        xsizes="(min-width: 600px) 400px, 100vw"
        @error="onImageLoadError"
        @load="onImageLoad"
      />
      <div class="detail f-col">
        <div class="toolbox f-row-ac f-justify-end">
          <v-menu align="c,rr,ll;bb,tt" transition="slide-y">
            <template v-slot:activator="{ toggle }">
              <v-btn class="icon small" :disabled="!imageInfo" @click="toggle">
                <v-icon name="circle-i-outline"/>
              </v-btn>
            </template>
            <template v-slot:menu="{ isOpen }">
              <div v-if="isOpen" class="popup-content img-info dark f-col">
                <div>
                  <translate class="label">Format</translate>: {{ imageInfo.format }}
                </div>
                <div>
                  <translate class="label">Size</translate>: {{ imageInfo.size }}
                </div>
                <div>
                  <translate class="label">Resolution</translate>: {{ imageInfo.resolution }}
                </div>
              </div>
            </template>
          </v-menu>
          <v-btn class="icon small" :disabled="disabled || !!error" @click="openEditor()">
            <v-icon name="tune"/>
          </v-btn>
          <v-btn class="icon small" :disabled="disabled" @click="$emit('delete')">
            <v-icon name="delete_forever"/>
          </v-btn>
        </div>
      </div>
    </template>
    <template v-else>
      <!-- <v-icon name="photo" height="54" width="54" color="#777"/> -->
      <photo-svg class="preview icon" height="60" fill="#777"/>
      <translate class="info">No image assigned</translate>
    </template>

    <div class="input-container">
      <slot name="input"/>
    </div>

    <v-dialog ref="editorDialog" content-class="fullscreen f-col">
      <template v-slot:header="">
        <div/>
      </template>
      <template v-slot:default="{ data }">
        <image-editor
          ref="imageEditor"
          class="f-grow light"
          :src="data.src"
          :format="data.format"
          :crop.sync="crop"
          :scale="outputScale"
          :quality="outputQuality"
          :padding="editorPadding"
          @update:image="editorImage = $event"
        >
          <template v-slot:append="{ editor }">
            <div class="toolbar shadow-2">
              <div class="tools f-row-ac">
                <v-menu align="ll;tt,bb" transition="fade">
                  <template v-slot:activator="{toggle}">
                    <v-btn class="icon small" @click="toggle">
                      <v-icon name="image-size"/>
                    </v-btn>
                  </template>
                  <template v-slot:menu>
                    <div class="sliders shadow-2">
                      <v-slider
                        hide-range-labels
                        label="Resize"
                        min="0"
                        max="1"
                        v-model="sliderScale"
                        @change="outputScale = sliderScale"
                      />
                      <span class="value">{{ Math.round(sliderScale * 100) }}%</span>
                      <v-slider
                        hide-range-labels
                        label="Quality"
                        :disabled="data.format === 'image/png'"
                        min="0"
                        max="1"
                        v-model="sliderQuality"
                        @change="outputQuality = sliderQuality"
                      />
                      <span class="value">{{ Math.round(sliderQuality * 100) }}</span>
                    </div>
                  </template>
                </v-menu>
                <v-btn class="icon small" :color="crop ? 'primary' : ''" @click="toggleCrop">
                  <v-icon name="crop"/>
                </v-btn>
                <div class="v-separator"/>
                <v-btn class="icon small" @click="editor.resetView()">
                  <v-icon name="magnifier"/>
                </v-btn>
                <span class="zoom-text">{{ Math.round(editor.zoom * 100) }}%</span>
                <div class="v-separator"/>
                <div class="item">
                  <translate class="label">Size</translate>
                  <span class="value">{{ outputFileSize }}</span>
                </div>
                <div class="item">
                  <translate class="label">Resolution</translate>
                  <span v-if="editorImage" class="value">{{ editorImage.width }}x{{ editorImage.height }}</span>
                </div>
              </div>
              <div class="actions f-row-ac">
                <v-btn class="action" color="primary" @click="confirmImage">
                  <v-icon name="circle-check-outline" class="mr-2"/>
                  <translate>Apply</translate>
                </v-btn>
                <v-btn class="action ml-0" color="dark" @click="closeEditor">
                  <v-icon name="x" class="mr-2"/>
                  <translate>Cancel</translate>
                </v-btn>
              </div>
            </div>
          </template>
        </image-editor>
      </template>
    </v-dialog>
  </div>
</template>

<script lang="js">
import Path from 'path'

import ImageEditor, { resizeImage } from '@/components/image/ImageEditor.vue'
import PhotoSvg from '@/assets/photo.svg?inline'
import formatFileSize from '@/format/filesize'

function formatFromFilename (filename) {
  const ext = Path.extname(filename).toLowerCase().replace('.', '')
  return ext ? `image/${ext === 'jpg' ? 'jpeg' : ext}` : ''
}

export default {
  components: { ImageEditor, PhotoSvg },
  props: {
    format: String,
    options: Object,
    disabled: Boolean,
    value: [String, Function],
    valueUrl: String,
    inputFile: [File, Blob]
  },
  data () {
    return {
      error: null,
      newImage: null,
      imageInfo: null,
      progress: 0,
      sliderScale: 1,
      sliderQuality: 0.8,
      outputScale: 1,
      outputQuality: 0.8,
      crop: null,
      editorImage: null
    }
  },
  computed: {
    empty () {
      return !this.value && !this.inputFile
    },
    maxResolution () {
      return parseFloat(this.options?.max_resolution)
    },
    newImageInfo () {
      return this.newImage && {
        filesize: formatFileSize(this.newImage.size),
        resolution: `${this.newImage.width}x${this.newImage.height}`,
        format: this.newImage.data.type.replace('image/', '')
      }
    },
    outputFileSize () {
      return this.editorImage && formatFileSize(this.editorImage.data.size)
    },
    resizeRequired () {
      if (this.newImage && this.maxResolution) {
        const imgRes = this.newImage.width * this.newImage.height / 1000000
        return imgRes > this.maxResolution
      }
      return false
    },
    maxSizeLimit () {
      return this.options?.max_size ? this.options.max_size * 1048576 : null
    }
  },
  watch: {
    value () {
      this.error = false
      this.imageInfo = null
      // this.newImage = null
    },
    inputFile: {
      immediate: true,
      handler (file) {
        if (file) {
          if (file !== this.newImage?.data) {
            this.setNewFile(file)
            if (!this.maxResolution && this.maxSizeLimit && file.size > this.maxSizeLimit) {
              this.$emit('error', this.$gettext('File exceeds maximum allowed size'))
            }
          }
        } else {
          this.newImage = null
        }
      }
    },
    newImage (n, o) {
      o?.free?.()
    }
  },
  beforeDestroy () {
    this.newImage?.free?.()
  },
  methods: {
    setNewImage (image) {
      this.newImage = Object.freeze(image)
    },
    async getFinalFile () {
      const image = this.newImage
      let { data, filename } = image

      const changeFormat = (this.format && this.format !== image.data.type)
      const imgRes = image.width * image.height / 1000000
      const scale = this.maxResolution && imgRes > this.maxResolution ? Math.sqrt(this.maxResolution / imgRes) : 1
      if (scale !== 1 || changeFormat) {
        const img = new Image()
        img.src = image.src
        await img.decode()
        const res = await resizeImage(img, this.format || image.data.type, scale, 0.85)
        data = res.data
        if (changeFormat) {
          filename = filename.slice(0, filename.lastIndexOf('.')) + this.format.replace('image/', '.')
        }
      }
      return { data, filename }
    },
    async setNewFile (file) {
      this.error = false
      let src = URL.createObjectURL(file)
      let img = new Image()
      img.src = src
      try {
        await img.decode()
      } catch (err) {
        this.error = 'Failed to decode image'
        URL.revokeObjectURL(src)
        this.$emit('handle-error', 'Failed to decode image')
        return
      }
      if (!this.resizeRequired && this.maxSizeLimit && file.size > this.maxSizeLimit) {
        this.$emit('error', this.$gettext('File exceeds maximum allowed size')+` (${formatFileSize(this.maxSizeLimit)})`)
      }
      // Resize to max. resolution immediately. Not suitable for post-cropping of the image.
      // const changeFormat = (this.format && this.format !== file.type)
      // const imgRes = img.naturalWidth * img.naturalHeight / 1000000
      // const scale = this.maxResolution && imgRes > this.maxResolution ? Math.sqrt(this.maxResolution / imgRes) : 1
      // if (scale !== 1 || changeFormat) {
      //   URL.revokeObjectURL(src)
      //   const { data } = await resizeImage(img, this.format || file.type, scale, 0.85)
      //   if (changeFormat) {
      //     data.name = file.name.slice(0, file.name.lastIndexOf('.')) + this.format.replace('image/', '.')
      //   } else {
      //     data.name = file.name
      //   }
      //   file = data
      //   src = URL.createObjectURL(data)
      //   img = new Image()
      //   img.src = src
      //   await img.decode()
      // }
      this.setNewImage({
        src,
        data: file,
        size: file.size,
        filename: file.name,
        width: img.naturalWidth,
        height: img.naturalHeight,
        free () {
          URL.revokeObjectURL(this.src)
        }
      })
    },
    toggleCrop () {
      this.crop = this.crop ? null : { left: 0, top: 0, right: 1, bottom: 1 }
    },
    onImageLoadError (e) {
      this.error = 'Failed to load image'
      // this.$emit('error', this.error)
    },
    onImageLoad (e) {
      const entries = performance.getEntriesByName(e.target.src)
      const size = entries[entries.length - 1]?.decodedBodySize
      this.imageInfo = {
        format: formatFromFilename(e.target.src).replace('image/', ''),
        resolution: `${e.target.naturalWidth}x${e.target.naturalHeight}`,
        size: formatFileSize(size)
      }
    },
    openEditor (image) {
      let params
      if (!image) {
        params = {
          src: this.valueUrl,
          format: formatFromFilename(this.value) || 'image/jpeg'
        }
      } else {
        params = {
          src: image.src,
          format: image.data.type
        }
      }
      this.$refs.editorDialog.show(params)
    },
    closeEditor () {
      this.editorImage = null
      this.$refs.editorDialog.close()
    },
    confirmImage () {
      if (this.editorImage) {
        const { width, height, data, src } = this.editorImage
        const filename = this.newImage?.filename || Path.basename(this.inputFile?.name || this.value)
        const image = {
          data,
          src,
          width,
          height,
          filename,
          size: data.size
        }
        if (!image.src) {
          image.src = URL.createObjectURL(data)
          image.free = function () {
            URL.revokeObjectURL(this.src)
          }
        }
        this.setNewImage(image)
        data.name = filename
        this.$emit('update:file', data)
        this.crop = null
        this.sliderScale = 1
        this.outputScale = 1
      }
      this.$refs.editorDialog.close()
    },
    editorPadding (viewer) {
      return viewer.crop ?[12, 12, (viewer.viewBox[0] > 600 ? 44 : 0) + 12, 12] : null
    },
    resetImage () {
      this.$emit('reset')
    }
  }
}
</script>

<style lang="scss" scoped>
.image-input {
  display: contents;
  // v2
  display: grid;
  grid-template-columns: auto minmax(auto, 1fr);
  grid-template-columns: auto minmax(150px, 1fr);
  grid-template-rows: 1fr auto;
  margin-top: 4px;

  ::v-deep img {
    max-height: 150px;
    // max-width: 160px;
    // max-width: clamp(50px, 100%, 160px);
    // min-width: 0;
  }
  > .preview {
    grid-area: 1 / 1 / 3 / 2;
    justify-self: center;
    align-self: start;
    min-width: 50px;
    max-width: 160px;
    display: flex;
  }
  .preview {
    ::v-deep {
      .image-error {
        height: 68px;
      }
    }
  }
  .img-error {
    color: var(--color-red);
    // font-size: 13px;
    justify-self: end;
    margin: 4px 0px;
  }
  .info {
    align-self: center;
    justify-self: center;
    text-transform: uppercase;
    font-weight: 500;
    opacity: 0.8;
  }
  .label {
    font-weight: 500;
    &::after {
      content: ":";
      padding-right: 4px;
    }
  }
  .input-container {
    display: flex;
    justify-content: flex-end;
    .btn {
      margin: 6px 0 0 6px;
    }
  }
  &.empty {
    .input-container {
      justify-content: center;
      .btn {
        margin: 6px 6px 0 6px;
      }
    }
  }
}
.detail {
  align-self: start;
  background-image: linear-gradient(to right, rgba(#ddd, 0.25), #d5d5d5);
  // background-image: linear-gradient(to right, rgba(var(--color-orange-rgb), 0.15), rgba(var(--color-orange-rgb), 0.75));
  // background-color: #ddd;
  // border: solid #d5d5d5;
  border-width: 1px 1px 1px 0;
  border-radius: 0 4px 4px 0;
  font-size: 13px;
  line-height: 1.35;
  padding: 4px 0;

  .toolbox {
    --gutter: 0 4px;
  }
  &.new {
    position: relative;
    .toolbox {
      position: absolute;
      top: 4px;
      right: 0;
    }
  }
  .notification {
    line-height: 1;
    color: var(--color-orange);
    .icon {
      vertical-align: top;
      margin-right: 3px;
    }
    span {
      padding-block: 2px;
      vertical-align: middle;
    }
  }
}
.image-editor {
  background-color: #333;
  position: relative;
  display: grid;
  // height: 0;
  // grid-template-rows: 1fr;
  // grid-template-columns: 1fr;
  ::v-deep > * {
    grid-area: 1 / 1 / 2 / 2;
  }

  .toolbar {
    z-index: 2;
    user-select: initial;
    pointer-events: auto;
    touch-action: initial;
  }

  @media (max-width: 600px) {
    grid-template-rows: auto 1fr auto;
    ::v-deep > * {
      grid-row: 2 / 3;
    }
    .toolbar {
      display: contents;
      .tools {
        grid-row: 1 / 2;
        justify-content: center;
        background-color: #242424;
        color: #fff;
        --icon-color: #fff;
        border-bottom: 1px solid #555;
        z-index: 2;
      }
      .actions {
        grid-row: 3 / 4;
        background-color: #242424;
        justify-content: space-between;
        // justify-content: flex-end;
        border-top: 1px solid #555;
        z-index: 2;
      }
    }
  }
}

.toolbar {
  // height: 40px;
  align-self: end;
  justify-self: center;
  // margin: 2px 0;
  min-width: 0;
  max-width: 100%;
  overflow: hidden;

  display: flex;
  align-items: center;
  background-color: #eee;
  // z-index: 1;
  // --gutter: 3px;
  .item {
    display: flex;
    flex-direction: column;
    margin: 0 6px;
    font-size: 12px;
    line-height: 1.35;
    .label {
      text-transform: uppercase;
      font-size: 12px;
      opacity: 0.8;
    }
    .value {
      font-weight: 500;
      font-size: 13px;
      white-space: nowrap;
    }
  }
  .btn.action {
    height: 32px;
    font-size: 15px;
  }
  .zoom-text {
    min-width: 40px;
  }
}

.sliders {
  min-width: 280px;
  display: grid;
  grid-template-columns: 1fr 44px;
  align-items: end;
  background-color: #eee;
  border-radius: 3px;
  border: 1px solid #ccc;
  margin: 8px 0;
  .value {
    text-align: right;
    margin: 6px;
    font-size: 13px;
  }
}
.img-info {
  padding: 4px;
  font-size: 13.5px;
  .label {
    font-weight: 500;
  }
}
</style>
