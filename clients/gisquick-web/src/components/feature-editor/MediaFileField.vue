<template>
  <input-field
    class="file-field"
    :class="{focused}"
    :label="label"
    :error="error || ''"
  >
    <input
      ref="input"
      type="file"
      hidden
      :accept="acceptString"
      @input="onChange"
      @change="onChange"
    />
    <input
      ref="cameraInput"
      type="file"
      capture="environment"
      hidden
      :accept="acceptString"
      @input="onChange"
      @change="onChange"
    />
      <component
        v-if="mediaComponent"
        ref="mediaComponent"
        :is="mediaComponent"
        :value="value"
        :value-url="valueUrl"
        :input-file="newFile"
        :disabled="disabled"
        :options="options"
        @reset="resetFile"
        @delete="deleteFile"
        @update:file="updateNewFile"
        @handle-error="widgetError = true"
        @error="error = $event"
      >
        <template v-slot:input>
          <div v-if="uploading" class="upload">
            <translate class="f-row-ac">Uploading</translate>
            <v-btn class="icon flat" @click="cancelUpload">
              <v-icon name="circle-x"/>
            </v-btn>
            <v-linear-progress :value="progress"/>
          </div>

          <v-btn
            v-else
            class="file-input"
            :disabled="disabled"
            :class="{mobile: isMobileDevice}"
            color="#555"
            @click="selectFile"
          >
            <div class="source f-row-ac">
              <v-icon name="folder-open" class="mr-2"/>
              <translate>Select</translate>
            </div>
            <template v-if="isMobileDevice">
              <div class="separator"/>
              <div class="source f-row-ac" role="button" data-src="cameraInput">
                <v-icon name="camera"/>
              </div>
            </template>
          </v-btn>
        </template>
      </component>
  </input-field>
</template>

<script lang="js">
import Path from 'path'

import InputField from '@/ui/InputField.vue'
import Focusable from '@/ui/mixins/Focusable'
import ImageInput from './ImageInput.vue'
import SimpleFileInput from './SimpleFileInput.vue'

export default {
  name: 'MediaFileField',
  mixins: [ Focusable ],
  components: { InputField, ImageInput, SimpleFileInput },
  props: {
    url: String,
    location: String,
    filename: String,
    label: String,
    initial: String,
    value: [String, Function],
    disabled: Boolean,
    options: Object
  },
  data () {
    return {
      error: null,
      uploading: false,
      progress: 0,
      newFile: null,
      widgetError: false
    }
  },
  computed: {
    acceptString () {
      const accept = this.options?.accept
      return Array.isArray(accept) ? accept.join(',') : accept
    },
    valueUrl () {
      if (this.value && typeof this.value === 'string') {
        return Path.join(this.url, this.value)
      }
      return null
    },
    isMobileDevice () {
      return window.env.mobile
    },
    mediaComponent () {
      if (!this.widgetError) {
        const filename = this.newFile?.name || this.value?.toString()
        if (filename) {
          const ext = Path.extname(filename).toLowerCase()
          const imgExts = ['.png', '.jpg', '.jpeg', '.gif', '.tif', '.tiff', '.webp']
          if (imgExts.includes(ext)) {
            return ImageInput
          }
        }
      }
      return SimpleFileInput
    }
  },
  watch: {
    initial: {
      immediate: true,
      handler () {
        this.newFile = null
      }
    },
    newFile () {
      this.error = false
      this.widgetError = false
    },
    error: {
      immediate: true,
      handler (err) {
        this.$emit('update:status', err ? 'error' : 'ok')
      }
    },
    value (v) {
      if (v === this.initial) {
        this.newFile = null
      }
    }
  },
  methods: {
    selectFile (e) {
      const src = e.target.getAttribute('data-src') || 'input'
      this.$refs[src]?.click()
    },
    takePhoto () {
      this.$refs.cameraInput.click()
    },
    deleteFile () {
      this.$emit('input', '')
    },
    resetFile () {
      this.newFile = null
      this.$emit('input', this.initial)
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
    setNewFile (file) {
      let filename = file.name || this.initial
      let data = file
      this.newFile = file

      const upload = async () => {
        this.progress = 0
        const cmp = this.$refs.mediaComponent
        if (cmp?.getFinalFile) {
          const f = await cmp.getFinalFile()
          if (f) {
            filename = f.filename || filename
            data = f.data || data
          }
        }
        // if (this.options.max_size && data.size > this.options.max_size * 1048576) {
        //   throw new Error('File exceeds maximum allowed size')
        // }
        const form = new FormData()
        // or use real filename as name parameter (first argument)?
        form.append('file', data, this.formatFilename(this.filename, filename))
        const source = this.$http.CancelToken.source()
        upload.cancel = () => source.cancel('')
        this.uploading = true
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
      this.$emit('input', upload)
    },
    updateNewFile (file) {
      if (!file.name) {
        file.name = this.newFile.name
      }
      this.setNewFile(file)
    },
    cancelUpload () {
      this.value.cancel?.()
    },
    async onChange (e) {
      let file = e.target.files[0]
      e.target.value = ''
      if (file) {
        this.setNewFile(file)
      }
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
.i-field.file-field {
  font-size: 14px;
  color: #555;
  --color: var(--color-primary);
}

.file-input {
  &.btn:not(.icon) {
    height: 28px;
    // min-width: unset;
    min-width: 100px;
  }
  &.btn.mobile {
    padding: 0;
    align-items: stretch;
    .source {
      padding: 0 8px;
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
  padding-right: 6px;
  max-width: 150px;
  justify-self: end;
  .linear-progress {
    grid-column: 1 / 3;
    margin: 0;
  }
}
</style>
