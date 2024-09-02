<template>
  <div v-if="feature || relationData || mode === 'add'" class="f-col info-panel light">
    <div class="f-col main-content shadow-2">
      <div v-if="relationData && mode !== 'add'" class="toolbar dark top f-row-ac">
        <v-btn class="icon" @click="popRelation">
          <v-icon name="arrow-backward"/>
        </v-btn>
        <span class="f-grow" v-text="relationData.layer.title"/>
        <v-btn @click="$emit('close')" class="icon flat">
          <v-icon name="x"/>
        </v-btn>
        <features-viewer :features="[relationData.feature]" :color="[31,203,124]"/>
      </div>
      <div v-else class="toolbar dark top f-row-ac">
        <template v-if="mode !== 'add'">
          <v-select
            class="flat f-grow my-0"
            :disabled="layersOptions.length < 2"
            :items="layersOptions"
            :value="selected ? selected.layer : layersOptions[0].value"
            @input="setActiveLayer"
          />
          <v-btn
            class="icon flat"
            :disabled="index === 0"
            @click="setSelected(index - 1)"
          >
            <v-icon name="arrow-left" size="16"/>
          </v-btn>
          <span v-if="selected" style="font-size: 14px">
            {{ index + 1 }}/{{ features.length }}
          </span>
          <v-spinner v-else size="16" width="2"/>
          <v-btn
            class="icon flat"
            :disabled="index === features.length - 1"
            @click="setSelected(index + 1)"
          >
            <v-icon name="arrow-right" size="16"/>
          </v-btn>
        </template>
        <template v-else>
          <span class="ml-2">{{ layer.title || layer.name }} -</span>
          <translate class="title mx-2 f-grow">New Feature</translate>
        </template>
        <v-btn @click="$emit('close')" class="icon flat">
          <v-icon name="x"/>
        </v-btn>
      </div>

      <collapse-transition class="collapse-container">
        <div v-show="!collapsed" class="wrapper">
          <scroll-area>
            <switch-transition>
              <feature-editor
                v-if="mode === 'edit'"
                ref="editor"
                class="edit-form"
                toolbar-target="infopanel-tool"
                :confirm-type="collapsed ? 'dialog' : 'overlay'"
                :project="project"
                v-bind="displayedData"
                @edit="onFeatureEdit"
                @delete="$emit('delete', $event)"
              />
              <new-feature-editor
                v-else-if="mode === 'add'"
                ref="editor"
                class="edit-form"
                toolbar-target="infopanel-tool"
                :confirm-type="collapsed ? 'dialog' : 'overlay'"
                :layer="layer"
                @edit="$emit('insert', $event)"
              />
              <!-- <component
                v-else
                :is="formComponent"
                :feature="feature"
                :layer="layer"
                :project="$store.state.project.config"
              /> -->
              <component
                v-else
                :is="formComponent"
                :project="project"
                v-bind="displayedData"
                @relation="showRelationFeature"
              />
            </switch-transition>
          </scroll-area>
        </div>
      </collapse-transition>
    </div>
    <div class="bottom-panel f-row-ac">
      <div class="edit-toolbar f-row-ac" :class="{active: mode !== 'view'}">
        <v-btn
          v-if="layerEditable"
          class="icon flat toggle"
          :color="mode === 'edit' ? 'primary' : null"
          @click="$emit('update:mode', mode === 'view' ? 'edit' : 'view')"
        >
          <v-icon name="edit"/>
        </v-btn>
        <portal-target
          name="infopanel-tool"
          class="toolbar-portal left f-row-ac"
          transition="collapse-width-transition"
        />
      </div>
      <v-btn
        class="icon flat"
        :disabled="zoomDisabled"
        @click="zoomToFeature"
      >
        <v-icon name="zoom-to"/>
      </v-btn>
      <v-btn
        class="icon flat minimize"
        @click="collapsed = !collapsed"
      >
        <v-icon name="arrow-down" :class="{collapsed}"/>
      </v-btn>
    </div>
  </div>
</template>

<script>
import GenericInfopanel from '@/components/GenericInfopanel.vue'
import FeaturesViewer from '@/components/ol/FeaturesViewer.vue'
import FeatureEditor from '@/components/feature-editor/FeatureEditor.vue'
import NewFeatureEditor from '@/components/feature-editor/NewFeatureEditor.vue'
import FeaturesReader from '@/components/attributes-table/features.js'
import { externalComponent } from '@/components-loader'
import { ShallowArray, ShallowObj } from '@/utils'

export default {
  name: 'info-panel',
  components: { GenericInfopanel, FeaturesViewer, FeatureEditor, NewFeatureEditor },
  mixins: [FeaturesReader],
  props: {
    selected: Object,
    layer: Object,
    features: Array,
    layers: Array,
    mode: { // 'edit', 'add', 'view'
      type: String,
      default: 'view'
    }
  },
  data () {
    return {
      collapsed: false,
      relationsData: []
    }
  },
  computed: {
    layersOptions () {
      const layers = this.layers || [this.layer]
      return layers.map(layer => ({
        text: layer.title || layer.name,
        value: layer.name
      }))
    },
    index () {
      return this.selected && this.features.findIndex(f => f.getId() === this.selected.id)
    },
    feature () {
      return this.features?.[this.index]
    },
    project () {
      return this.$store.state.project
    },
    displayedData () {
      return this.relationData || {
        feature: this.feature,
        layer: this.layer
      }
    },
    formComponent () {
      const { layer } = this.displayedData
      if (layer.infopanel_component) {
        try {
          const project = this.project.config
          return externalComponent(project, layer.infopanel_component)
        } catch (err) {
          console.error(`Failed to load infopanel component: ${layer.infopanel_component}`)
        }
      }
      return GenericInfopanel
    },
    zoomDisabled () {
      const { feature } = this.displayedData
      return this.mode !== 'add' && (!feature || !feature.getGeometry())
    },
    layerEditable () {
      const { permissions = {} } = this.displayedData.layer
      return permissions.update || permissions.delete
    },
    relationData () {
      return this.relationsData[this.relationsData.length - 1]
    }
  },
  watch: {
    selected (selection) {
      if (selection?.layer && this.features?.some(f => f.getId() === selection.id)) {
        this.relationsData = []
      }
    }
  },
  methods: {
    setActiveLayer (layer) {
      this.$emit('update:layer', layer)
    },
    setSelected (featureIndex) {
      this.$emit('update:selected', { layer: this.selected.layer, id: this.features[featureIndex].getId() })
    },
    zoomToFeature () {
      if (this.mode === 'add') {
        const geom = this.$refs.editor?.getGeometry()
        if (geom) {
          this.$map.ext.zoomToGeometry(geom)
        }
      } else {
        this.$map.ext.zoomToFeature(this.relationData?.feature || this.feature)
      }
    },
    async onFeatureEdit (f) {
      if (this.relationData) {
        const { layer, prev } = this.relationData
        const feature = await this.getFeatureById(f.getId(), layer)
        if (prev.feature._relationsData) {
          Object.values(prev.feature._relationsData).forEach(features => {
            const index = features.findIndex(rf => rf.getId() === f.getId())
            if (index !== -1) {
              features[index] = feature
            }
          })
        }
        this.relationData.feature = feature
      } else {
        this.$emit('edit', f)
      }
    },
    async showRelationFeature (relation, feature) {
      const relationData = ShallowObj({
        layer: relation.layer,
        feature,
        prev: {
          ...this.selected,
          feature: this.displayedData.feature
        }
      })
      this.relationsData.push(relationData)
      this.$map.ext.centerToGeometry(feature.getGeometry())
      this.$emit('update:selected', { layer: relation.layer.name, id: feature.getId() })
    },
    popRelation () {
      const { prev } = this.relationData
      this.$emit('update:selected', { layer: prev.layer, id: prev.feature.getId() })
      this.$map.ext.centerToGeometry(prev.feature.getGeometry())
      this.$nextTick(() => {
        this.relationsData.pop()
      })
    }
  }
}
</script>

<style lang="scss" scoped>
// required for scrolling and collapse animation
.collapse-container:not(.collapse-enter-active) {
  overflow: hidden;
  display: grid;
  > .wrapper {
    overflow: hidden;
    display: grid;
  }
}

.info-panel {
  position: relative;
  overflow: hidden;
  @media (max-width: 500px) {
    width: calc(100vw - 26px);
    max-width: calc(100vw - 26px);
  }
  @media (min-width: 501px) {
    .generic-infopanel, .edit-form {
      width: 400px;
    }
  }
  .main-content {
    border-top-left-radius: 3px;
    border-top-right-radius: 3px;
    border-bottom-left-radius: 3px;
    border-radius: 3px;
    border: 1px solid #aaa;
    background-color: #fff;
    overflow: hidden;
    position: relative;
  }
  .toolbar {
    flex-shrink: 0;
    &.top {
      background-color: #444;
      height: 36px;
      line-height: 1;
      --fill-color: transparent;
      .i-field ::v-deep .input {
        height: 28px;
      }
    }
    &.tools {
      flex: 0 0 auto;
      align-self: end;
      justify-self: end;
      border-top-left-radius: 12px;
      border-bottom-left-radius: 12px;

      bottom: 2px;
      margin-top: 1px;
      margin-bottom: 2px;
      padding-left: 6px;
      overflow: visible;
      background-color: rgba(#555, 0.5);
      z-index: 1;
      height: 24px;
      .btn {
        margin: 0 3px;
      }
      .icon {
        width: 18px;
        height: 18px;
      }
    }
  }
  .bottom-panel {
    padding-inline: 1px;
    margin-top: -1px;
    align-self: end;
    background-color: #eee;
    --gutter: 3px 4px;
    border-top: 1px solid #ccc;
    border-inline: 1px solid #777;
    border-bottom: 1px solid #777;
    border-bottom-left-radius: 4px;
    border-bottom-right-radius: 4px;
    position: relative;
    box-shadow: 0 4px 8px rgba(0,0,0,0.2), 0 3px 3px rgba(0,0,0,0.15);
    overflow: auto;
    flex-shrink: 0;
    max-width: calc(100% - 6px);
    max-width: 100%;
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
.edit-toolbar {
  --gutter: 0 4px;
  border-radius: 4px;
  &.active {
    margin: 2px;
    .toggle {
      background-color: #ddd;
      --gutter: 0;
      padding: 3px;
      border: 1px dashed #aaa;
      border-width: 1px 0 1px 1px;
    }
    .toolbar-portal {
      border: 1px dashed #bbb;
      border-width: 1px 1px 1px 0;
      border-top-right-radius: 3px;
      border-bottom-right-radius: 3px;
    }
  }
}
</style>
