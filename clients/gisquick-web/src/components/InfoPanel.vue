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
        <switch-transition class="mt-2">
          <feature-editor
            v-if="editMode"
            :feature="feature"
            :layer="layer"
            @edit="$emit('edit')"
          >
            <template v-slot:form="{ fields }">
              <generic-edit-form
                :layer="layer"
                :fields="fields"
              />
            </template>
          </feature-editor>
          <component
            v-else-if="customComponent"
            :is="customComponent"
            :feature="feature"
            :layer="layer"
          />
          <generic-infopanel
            v-else
            :layer="layer"
            :feature="feature"
            class="mx-2"
          />
        </switch-transition>
      </scroll-area>

      <div class="bottom-area"/>
      <v-layout class="toolbar tools pl-1 align-end">
        <v-btn @click="zoomToFeature" dark icon small>
          <icon name="zoom-to"/>
        </v-btn>
        <v-btn
          v-if="layer.editable"
          :class="{'primary--text': editMode}"
          @click="editMode = !editMode"
          icon dark
        >
          <v-icon>edit</v-icon>
        </v-btn>
      </v-layout>
      <portal-target
        name="infopanel-tool"
        class="toolbar left"
        transition="collapse-transition"
      />
    </div>
  </v-layout>
</template>

<script>
import GenericInfopanel from '@/components/GenericInfopanel'
import FeatureEditor from '@/components/FeatureEditor'
import GenericEditForm from '@/components/GenericEditForm'

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
  components: { GenericInfopanel, GenericEditForm, FeatureEditor },
  props: {
    data: Array,
    selected: Object
  },
  data () {
    return {
      editMode: false
    }
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
    background-color: #ddd;
    &.top {
      border-bottom: 1px solid #aaa;
    }
    &.tools {
      flex: 0 0 auto;
      align-self: end;
      justify-self: end;
      border-top-left-radius: 12px;
      border-bottom-left-radius: 12px;

      grid-row: 1 / 3;
      bottom: 2px;
      margin-top: 1px;
      margin-bottom: 2px;
      overflow: visible;
      background-color: rgba(#555, 0.5);
      z-index: 1;
    }
    &.left {
      justify-self: start;
      grid-row: 2 / 3;
      background-color: transparent;
      > /deep/ div {
        background-color: #eee;
        border-top-right-radius: 6px;
        border-bottom-right-radius: 6px;
        border: 1px solid #ccc;
      }
      .icon, .v-icon {
        opacity: 0.8;
      }
    }
    .v-btn {
      margin: 0;
      height: 24px;
    }
    // .v-divider--vertical {
    //   height: 20px;
    // }
    .icon {
      height: 18px;
      width: 18px;
    }
  }
  .content-layout {
    overflow: hidden;
    position: relative;
    display: grid;
    grid-template-rows: 1fr minmax(0, auto);
    > * {
      grid-row: 1 / 2;
      grid-column: 1 / 2;
    }
  }
  // .bottom-area {
  //   grid-row: 2 / 3;
  //   grid-column: 1 / 2;
  //   background-color: #eee;
  //   width: 100%;
  //   height: 100%;
  //   &:after {
  //     content: "";
  //     height: 1px;
  //     width: 100%;
  //     position: absolute;
  //     background-color: #ccc;
  //   }
  // }
}
</style>
