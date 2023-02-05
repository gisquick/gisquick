<template>
  <input-field
    class="image-field"
    :class="{focused}"
    :label="label"
    :error="error || ''"
  >
    <input
      ref="input"
      type="file"
      hidden
      :accept="accept"
      @input="onChange"
      @change="onChange"
    />
    <input
      ref="cameraInput"
      type="file"
      capture="environment"
      hidden
      :accept="accept"
      @input="onChange"
      @change="onChange"
    />
    <div class="container" :class="{empty}">
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
      <template v-else-if="currentImage">
        <v-image
          class="preview"
          :src="currentImage"
          :xsrcset="`${currentImage}?width=400 400w, ${currentImage}?width=1200 1200w`"
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
                    <translate class="label">Resolution</translate>: {{ imageInfo.width }}x{{ imageInfo.height }}
                  </div>
                </div>
              </template>
            </v-menu>
            <v-btn class="icon small" :disabled="disabled || !!error" @click="openEditor()">
              <v-icon name="tune"/>
            </v-btn>
            <v-btn class="icon small" :disabled="disabled" @click="deleteImage()">
              <v-icon name="delete_forever"/>
            </v-btn>
          </div>
        </div>
      </template>
      <template v-else>
        <!-- <v-icon name="photo" height="54" width="54" color="#777"/> -->
        <photo-svg class="preview icon" height="60" fill="#777"/>
        <span class="info text-right">No image assigned</span>
      </template>

      <div v-if="uploading" class="upload ml-2">
        <translate class="f-row-ac">Uploading</translate>
        <v-btn class="icon flat" @click="cancelUpload">
          <v-icon name="circle-x"/>
        </v-btn>
        <v-linear-progress :value="progress"/>
      </div>

      <v-btn
        v-else
        class="image-input"
        :disabled="disabled"
        :class="{mobile: isMobileDevice}"
        color="#555"
        @click="selectFile"
      >
        <translate class="f-row-ac">Select Image</translate>
        <template v-if="isMobileDevice">
          <div class="separator"/>
          <div class="f-row-ac" role="button" data-src="cameraInput">
            <v-icon name="camera"/>
          </div>
        </template>
      </v-btn>

      <!-- <div class="image-input f-row-ac">
        <v-btn class="small" color="primary" @click="selectFile">
          <translate>Select Image</translate>
        </v-btn>
        <v-btn v-if="isMobileDevice" class="icon small ml-2" @click="takePhoto">
          <v-icon name="camera"/>
        </v-btn>
      </div> -->
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
  </input-field>
</template>

<script>
import Path from 'path'
import WFS from 'ol/format/WFS'
import EqualTo from 'ol/format/filter/EqualTo'

import InputField from '@/ui/InputField.vue'
import ImageEditor, { resizeImage } from '@/components/image/ImageEditor.vue'
import Focusable from '@/ui/mixins/Focusable'
import PhotoSvg from '@/assets/photo.svg?inline'

function getWfs (layername, attrname, value) {
  const opts = {
    featureNS: 'http://www.qgis.org/gml',
    featurePrefix: 'gml',
    featureType: layername,
    version: '1.1.0'
  }
  const wfs = new WFS()
  // console.log(wfs)
  // console.log(WFS)
  const filter = new EqualTo(attrname, value)
  // console.log(WFS.writeFilter(filter))
  console.log(wfs.writeGetFeature({ ...opts, featureTypes: [layername], filter, resultType: 'hits' }))
}

const SizeUnits = {
  MB: value => (value / 1048576).toFixed(2),
  // kB: value => Math.round(value / 1024),
  kB: value => (value / 1024).toFixed(1),
  B: value => Math.round(value)
}

export function formatFileSize (value, unit) {
  if (!value) {
    return value
  }
  if (!unit) {
    if (value > 1048576) {
      unit = 'MB'
    } else if (value > 1024) {
      unit = 'kB'
    } else {
      unit = 'B'
    }
  }
  return `${SizeUnits[unit](value)} ${unit}`
}

export default {
  name: 'MediaUploadField',
  mixins: [ Focusable ],
  components: { InputField, ImageEditor, PhotoSvg },
  props: {
    url: String,
    location: String,
    filename: String,
    format: String,
    maxResolution: Number,
    label: String,
    initial: String,
    value: [String, Function],
    disabled: Boolean,
    accept: {
      type: String,
      default: 'image/*'
    }
  },
  data () {
    return {
      error: null,
      newImage: null,
      imageInfo: null,
      uploading: false,
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
    currentImage () {
      if (this.value && typeof this.value === 'string') {
        return Path.join(this.url, this.value)
      }
      return null
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
    empty () {
      return !this.value && !this.newImage
    },
    isMobileDevice () {
      return window.env.mobile
    },
    resizeRequired () {
      if (this.newImage && this.maxResolution) {
        const imgRes = this.newImage.width * this.newImage.height / 1000000
        return imgRes > this.maxResolution
      }
      return false
    }
  },
  watch: {
    initial: {
      immediate: true,
      handler () {
        this.error = false
        this.newImage = null
        this.imageInfo = null
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
    selectFile (e) {
      const src = e.target.getAttribute('data-src') || 'input'
      this.$refs[src]?.click()
    },
    takePhoto () {
      this.$refs.cameraInput.click()
    },
    deleteImage () {
      // getWfs('districts', 'attr', this.value)
      this.$emit('input', '')
    },
    formatFilename (template, filename) {
      let name = template
      if (name.endsWith('<filename>')) {
        name = name.replace('<filename>', filename)
      } else if (name.includes('<filename>')) {
        const ext = Path.extname(filename)
        if (ext) {
          name = name.replace('<filename>', filename.slice(0, filename.lastIndexOf(ext)))
        }
      }
      if (!Path.extname(name)) {
        name += Path.extname(filename)
      }
      return name
    },
    setNewImage (image) {
      // const filename = image.filename ? Path.join(this.location, image.filename) : this.initial
      let filename = image.filename ? image.filename : this.initial

      const upload = async () => {
        let data = image.data

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
            filename = filenamee.slice(0, filename.lastIndexOf('.')) + this.format.replace('image/', '.')
          }
        }

        this.progress = 0
        this.uploading = true
        const form = new FormData()
        // or use real filename as name parameter (first argument)?
        form.append('file', data, this.formatFilename(this.filename, filename))
        const source = this.$http.CancelToken.source()
        upload.cancel = () => source.cancel('')
        try {
          // const { data } = await this.$http.post(this.url, form, {
          const { data } = await this.$http.post(Path.join(this.url, this.location), form, {
            onUploadProgress: evt => {
              this.progress = 100 * (evt.loaded / evt.total)
            },
            cancelToken: source.token,
            params: {
              // layer: this.location
            }
          })
          return Path.join(this.location, data.filename)
        } catch (err) {
          if (!this.$http.isCancel(err)) {
            if (err.response?.status === 413) {
              this.error = this.$gettext('Project size limit reached')
            } else {
              this.error = this.$gettext('Failed to upload file')
            }
          }
          throw err
        } finally {
          this.uploading = false
        }
      }
      upload.toString = () => filename
      this.newImage = Object.freeze(image) // may contain native objects and reactivity is not needed
      this.$emit('input', upload)
    },
    cancelUpload () {
      this.value.cancel?.()
    },
    async onChange (e) {
      let file = e.target.files[0]
      e.target.value = ''
      if (!file) {
        return
      }
      let src = URL.createObjectURL(file)
      let img = new Image()
      img.src = src
      await img.decode()

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
      this.error = false
    },
    toggleCrop () {
      this.crop = this.crop ? null : { left: 0, top: 0, right: 1, bottom: 1 }
    },
    onImageLoadError (e) {
      this.error = 'Failed to load image'
    },
    onImageLoad (e) {
      const format = Path.extname(e.target.src).toLowerCase().replace('.', '')
      const entries = performance.getEntriesByName(e.target.src)
      const size = entries[entries.length - 1]?.decodedBodySize
      this.imageInfo = {
        format: format === 'jpg' ? 'jpeg' : format,
        width: e.target.naturalWidth,
        height: e.target.naturalHeight,
        size: formatFileSize(size) // transferSize
      }
    },
    openEditor (image) {
      let params
      if (!image) {
        params = {
          src: this.currentImage,
          format: 'image/jpeg'
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
        const image = {
          data,
          src,
          width,
          height,
          filename: this.newImage?.filename,
          size: data.size
        }
        if (!image.src) {
          image.src = URL.createObjectURL(data)
          image.free = function () {
            URL.revokeObjectURL(this.src)
          }
        }
        this.setNewImage(image)
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
      this.newImage = null
      this.$emit('input', this.initial)
    },
    afterFeatureDeleted () {
      if (this.initial) {
        const url = Path.join(this.url, this.initial)
        this.$http.delete(url)
      }
    },
    async afterFeatureUpdated (f) {
      if (this.initial && this.initial !== this.value) {
        const url = Path.join(this.url, this.initial)
        this.$http.delete(url) // not returning promise, so error will not cause save failure
      }
    }
  }
}
</script>

<style lang="scss" scoped>
.i-field.image-field {
  font-size: 14px;
  color: #555;
  --color: var(--color-primary);
  // align-self: flex-start;
}

.container {
  display: grid;
  grid-template-columns: auto minmax(auto, 1fr);
  grid-template-rows: 1fr auto;
  --gutter: 0;
  margin: 4px 0;
  ::v-deep img {
    max-height: 150px;
    // max-width: 160px;
    // max-width: clamp(50px, 100%, 160px);
    // min-width: 0;
  }
  > .preview {
    grid-area: 1 / 1 / 3 / 2;
    justify-self: center;
    align-self: center;
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
  &.empty {
    .image-input {
      justify-self: center;
    }
  }
}
.detail {
  align-self: start;
  // justify-self: end;
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
.image-input {
  justify-self: end;
  // align-self: center;
  &.btn:not(.icon) {
    height: 28px;
    min-width: unset;
    margin: 6px 0 0 6px;
  }
  &.btn.mobile {
    padding: 0;
    align-items: stretch;
    .f-row-ac {
      padding: 0 10px;
    }
    .separator {
      border-right: 1px solid currentColor;
      align-self: stretch;
      opacity: 0.5;
    }
    [data-src] > *{
      pointer-events: none;
    }
  }
}
.upload {
  text-transform: uppercase;
  font-size: 13px;
  font-weight: 500;
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 6px;
  .linear-progress {
    grid-column: 1 / 3;
    margin: 0;
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
