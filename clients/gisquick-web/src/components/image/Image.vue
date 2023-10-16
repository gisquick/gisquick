<template>
  <div :class="{error}">
    <slot :open-viewer="openViewer">
      <slot v-if="loading" name="loading"/>
      <slot v-else-if="error" name="error">
        <broken-photo-svg class="image-error p-2" fill="var(--color-red)"/>
      </slot>
      <img
        v-if="!error"
        :alt="alt"
        :src="thumbnail || src"
        v-bind="$attrs"
        @error="onError"
        @load="onLoad"
        @click="openViewer"
      />
    </slot>
    <v-dialog content-class="fullscreen f-col" v-model="open">
      <template v-slot:header>
        <span/>
      </template>
      <image-viewer class="f-grow" :src="src">
        <template v-slot:default="{ viewer }">
          <div class="toolbar f-row-ac">
            <v-btn class="icon small" @click="viewer.resetView">
              <v-icon name="magnifier"/>
            </v-btn>
            <span>{{ Math.round(viewer.zoom * 100) }}%</span>
            <v-btn class="icon small" @click="download">
              <v-icon name="download"/>
            </v-btn>
            <v-btn class="icon small" @click="open = false">
              <v-icon name="x"/>
            </v-btn>
          </div>
        </template>
      </image-viewer>
    </v-dialog>
  </div>
</template>

<script lang="js">
import FileSaver from 'file-saver'
import ImageViewer from './ImageViewer.vue'
import BrokenPhotoSvg from '@/assets/photo-broken.svg?component'

export default {
  components: { ImageViewer, BrokenPhotoSvg },
  inheritAttrs: false,
  props: {
    alt: String,
    src: String,
    thumbnail: String
  },
  data () {
    return {
      open: false,
      loading: false,
      error: false
    }
  },
  watch: {
    src () {
      this.loading = true
      this.error = false
    }
  },
  methods: {
    onError (e) {
      this.error = true
      this.loading = false
      this.$emit('error', e)
    },
    onLoad (e) {
      this.loading = false
      this.$emit('load', e)
    },
    download () {
      FileSaver.saveAs(this.src)
    },
    openViewer () {
      this.open = true
    }
  }
}
</script>

<style lang="scss" scoped>
.toolbar {
  position: absolute;
  top: 0;
  right: 0;
  z-index: 1;
  --icon-color: #fff;
  color: #fff;
  background-color: rgba(#333, 0.5);
  user-select: none;
}
img {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
  cursor: zoom-in;
}
</style>
