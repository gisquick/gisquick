<template>
  <div v-if="feature" class="f-col info-panel light">
    <div v-if="relationData" class="toolbar dark top f-row-ac">
      <v-btn class="icon" @click="relationData = null">
        <v-icon name="arrow-backward"/>
      </v-btn>
      <span class="f-grow" v-text="relationData.layer.title"/>
      <v-btn @click="$emit('close')" class="icon flat">
        <v-icon name="x"/>
      </v-btn>
      <features-viewer :features="[relationData.feature]" :color="[31,203,124]"/>
    </div>
    <div v-else class="toolbar dark top f-row-ac">
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
      <v-btn @click="$emit('close')" class="icon flat">
        <v-icon name="x"/>
      </v-btn>
    </div>

    <div class="content-layout">
      <scroll-area>
        <switch-transition>
          <feature-editor
            v-if="editMode"
            class="edit-form"
            toolbar-target="infopanel-tool"
            :feature="feature"
            :layer="layer"
            :project="$store.state.project.config"
            @edit="$emit('edit', $event)"
            @delete="$emit('delete', $event)"
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
            v-bind="viewerParams"
            @xrelation="(l, a, v) => $emit('relation', l, a, v)"
            @relation="showRelation"
          />
        </switch-transition>
      </scroll-area>

      <div class="toolbar tools dark f-row-ac">
        <v-btn class="icon flat" @click="zoomToFeature">
          <v-icon name="zoom-to"/>
        </v-btn>
        <v-btn
          v-if="layerEditable"
          class="icon flat"
          :color="editMode ? 'primary' : null"
          @click="$emit('update:editMode', !editMode)"
        >
          <v-icon name="edit"/>
        </v-btn>
      </div>
      <portal-target
        name="infopanel-tool"
        class="toolbar-portal toolbar left"
        transition="collapse-transition"
      />
    </div>
  </div>
</template>

<script>
import GeoJSON from 'ol/format/GeoJSON'
import { layerFeaturesQuery } from '@/map/featureinfo'
import { formatFeatures } from '@/formatters'

import GenericInfopanel from '@/components/GenericInfopanel.vue'
import FeatureEditor from '@/components/feature-editor/FeatureEditor.vue'
import FeaturesViewer from '@/components/ol/FeaturesViewer.vue'
import { externalComponent } from '@/components-loader'
import { ShallowArray, ShallowObj } from '@/utils'

export default {
  name: 'info-panel',
  components: { GenericInfopanel, FeatureEditor, FeaturesViewer },
  props: {
    selected: Object,
    layer: Object,
    features: Array,
    layers: Array,
    editMode: Boolean
  },
  data () {
    return {
      relationData: null
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
      return this.selected && this.selected.featureIndex
    },
    feature () {
      return this.selected && this.features[this.index]
    },
    project () {
      return this.$store.state.project
    },
    viewerParams () {
      if (this.relationData) {
        return {
          ...this.relationData,
          project: this.project.config
        }
      }
      return {
        feature: this.feature,
        layer: this.layer,
        project: this.project.config
      }
    },
    formComponent () {
      if (this.layer.infopanel_component) {
        try {
          const project = this.$store.state.project.config
          return externalComponent(project, this.layer.infopanel_component)
        } catch (err) {
          console.error(`Failed to load infopanel component: ${this.layer.infopanel_component}`)
        }
      }
      return GenericInfopanel
    },
    layerEditable () {
      const { permissions = {} } = this.layer
      return permissions.update || permissions.delete
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
      this.$map.ext.zoomToFeature(this.relationData?.feature || this.feature)
    },
    async showRelation (layer, attr, value) {
      console.log('showRelation', layer, attr, value)
      const mapProjection = this.$map.getView().getProjection().getCode()
      const rel = {
        referencing_fields: ['PKUID'],
      //   referenced_fields: ['PKUID']
      }
      const filters = rel.referencing_fields.map((field, i) => ({
        attribute: field,
        operator: '=',
        value: value
      }))
      const query = layerFeaturesQuery(layer, null, filters)
      const params = {
        'VERSION': '1.1.0',
        'SERVICE': 'WFS',
        'REQUEST': 'GetFeature',
        'OUTPUTFORMAT': 'GeoJSON',
        'MAXFEATURES': 100
      }
      const headers = { 'Content-Type': 'text/xml' }
      const { data } = await this.$http.post(this.project.config.ows_url, query, { params, headers })
      const parser = new GeoJSON()
      const features = parser.readFeatures(data, { featureProjection: mapProjection })
      formatFeatures(this.project, layer, features)
      console.log(features)

      this.relationData = ShallowObj({
        layer,
        feature: features[0]
      })
      // this.relationData = {
      //   layer,
      //   features: ShallowArray(features)
      // }
      // this.$map.ext.zoomToFeature(features[0])
      // this.$store.commit('attributeTable/layer', layer)
      // this.$store.commit('activeTool', 'attribute-table')
    }
  }
}
</script>

<style lang="scss" scoped>
.info-panel {
  position: relative;
  border-radius: 3px;
  border: 1px solid #aaa;
  background-color: #fff;
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
  .content-layout {
    overflow: hidden;
    position: relative;
    display: grid;
    grid-template-rows: 1fr minmax(8px, auto);
    .scroll-container {
      grid-row: 1 / 2;
      grid-column: 1 / 2;
    }
    .tools {
      grid-row: 1 / 3;
      grid-column: 1 / 2;
    }
    .toolbar-portal {
      grid-row: 2 / 3;
      grid-column: 1 / 2;
      background-color: #e0e0e0;
      border-top: 1px solid #bbb;
      align-self: end;
    }
  }
}
</style>
