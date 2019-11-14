<template>
  <v-layout class="column info-panel" v-if="feature">
    <v-layout class="row align-center pl-2 pr-1 py-1 toolbar top">
      <v-select
        :items="layersOptions"
        :value="selected.layer"
        @input="setActiveLayer"
        :disabled="layersOptions.length < 2"
        class="my-0"
        hide-details
      />
      <v-btn
        :disabled="index === 0"
        @click="setSelected(index - 1)"
        icon
      >
        <v-icon>navigate_before</v-icon>
      </v-btn>
      <span style="font-size: 14px">{{ index + 1 }}/{{ features.length }}</span>
      <v-btn
        @click="setSelected(index + 1)"
        :disabled="index === features.length - 1"
        icon
      >
        <v-icon>navigate_next</v-icon>
      </v-btn>
      <v-btn @click="$emit('close')" icon small>
        <v-icon>close</v-icon>
      </v-btn>
    </v-layout>

    <div class="content-layout">
      <scroll-area class="pb-2">
        <div
          v-if="customComponent"
          :is="customComponent"
          :feature="feature"
          :layer="layer"
        />
        <generic-infopanel
          v-else
          :layer="layer"
          :feature="feature"
          class="mx-2 mt-2"
        />
      </scroll-area>

      <v-layout class="toolbar tools pl-1 align-end">
        <v-btn @click="zoomToFeature" dark icon small>
          <icon name="zoom-to"/>
        </v-btn>
      </v-layout>
    </div>

    <portal-target
      name="infopanel-tool"
      class="toolbar left"
      transition="collapse-transition"
    />
  </v-layout>
</template>

<script>
import GenericInfopanel from '@/components/GenericInfopanel'

const cache = {}
function externalComponent (url) {
  if (cache[url]) {
    return cache[url]
  }

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
      return (this.layerFeatures && this.layerFeatures.features) || []
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
    },
    zoomToFeature () {
      this.$map.ext.zoomToFeature(this.feature)
    }
  }
}
</script>

<style lang="scss" scoped>
.info-panel {
  position: relative;
  border-radius: 3px;
  width: 23em;
  border: 1px solid #aaa;
  background-color: #fff;
  overflow: hidden;

  .toolbar {
    &.top {
      background-color: #ddd;
      border-bottom: 1px solid #aaa;
    }
    &.tools {
      flex: 0 0 auto;
      align-self: end;
      justify-self: end;
      border-top-left-radius: 12px;
      border-bottom-left-radius: 12px;
      margin-bottom: 2px;
      background-color: rgba(#555, 0.5);
    }
    .v-btn {
      margin: 0;
      height: 24px;
    }
    .icon {
      height: 18px;
      width: 18px;
    }
  }
  .content-layout {
    overflow: hidden;
    display: grid;
    grid-template-rows: 1fr;
    > * {
      grid-row: 1 / 2;
      grid-column: 1 / 2;
    }
  }
}
</style>
