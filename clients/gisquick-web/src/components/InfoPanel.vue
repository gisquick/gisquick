<template>
  <v-layout class="column info-panel" v-if="feature">
    <v-layout class="row align-center px-2 pb-1 toolbar">
      <v-select
        :items="layersOptions"
        :value="selected.layer"
        @input="setActiveLayer"
        :disabled="layersOptions.length < 2"
        class="my-0"
        hide-details
      />
      <v-spacer/>

      <v-btn
        :disabled="index === 0"
        @click="setSelected(index - 1)"
        icon
      >
        <v-icon>navigate_before</v-icon>
      </v-btn>
      <span>{{ index + 1 }}/{{ features.length }}</span>
      <v-btn
        @click="setSelected(index + 1)"
        :disabled="index === features.length - 1"
        icon
      >
        <v-icon>navigate_next</v-icon>
      </v-btn>
      <v-btn @click="$emit('close')" icon>
        <v-icon>close</v-icon>
      </v-btn>
    </v-layout>

    <div
      v-if="customComponent"
      :is="customComponent"
      :feature="feature"
      :layer="layer"
    />
    <generic-infopanel
      v-else
      class="grid mx-2 my-2"
      :layer="layer"
      :feature="feature"
    />
  </v-layout>
</template>

<script>
import Vue from 'vue'
import GenericInfopanel from '@/components/GenericInfopanel'

const cache = {}
function externalComponent (url) {
  if (cache[url]) {
    return cache[url]
  }
  window.Vue = Vue
  return new Promise((resolve, reject) => {
    const name = url.split('/').reverse()[0].match(/^(.*?)\.umd/)[1]
    const script = document.createElement('script')
    script.async = true
    script.addEventListener('load', () => {
      cache[url] = window[name]
      resolve(window[name])
    })
    script.addEventListener('error', () => {
      reject(new Error(`Error loading ${url}`))
    })
    script.src = url
    document.head.appendChild(script)
  })
}

export default {
  name: 'info-panel',
  components: { GenericInfopanel },
  props: {
    data: Array,
    selected: Object
  },
  computed: {
    layersOptions () {
      return this.data.map(item => ({
        text: item.layer.title || item.layer.name,
        value: item.layer.name
      }))
    },
    layerFeatures () {
      return this.selected && this.data.find(i => i.layer.name === this.selected.layer)
    },
    layer () {
      return this.layerFeatures && this.layerFeatures.layer
    },
    features () {
      return this.layerFeatures && this.layerFeatures.features
    },
    index () {
      return this.selected && this.selected.featureIndex
    },
    feature () {
      return this.selected && this.features[this.index]
    },
    customComponents () {
      const components = {}
      this.$store.state.project.overlays.list.filter(l => l.info_panel)
        .forEach(l => {
          components[l.name] = async () => {
            const { resource, component } = l.info_panel
            const mod = await externalComponent(resource)
            return mod.__esModule ? mod.default[component] : mod
          }
        })
      return components
    },
    /* Development */
    // customComponents () {
    //   return {
    //     districts: () => import('@/extensions/Districts.vue')
    //   }
    // },
    customComponent () {
      return this.customComponents[this.layer.name]
    }
  },
  methods: {
    setActiveLayer (layer) {
      this.$emit('selection-change', { layer, featureIndex: 0 })
    },
    setSelected (featureIndex) {
      this.$emit('selection-change', { layer: this.selected.layer, featureIndex })
    }
  }
}
</script>

<style lang="scss" scoped>
.info-panel {
  position: relative;
  border-radius: 3px;
  width: 24em;
  border: 1px solid #aaa;
  background-color: #fff;

  .toolbar {
    background-color: #ddd;
    border-bottom: 1px solid #aaa;
    position: sticky;
    top: 0;
    .v-btn {
      margin: 0;
    }
  }
}
</style>
