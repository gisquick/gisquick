<template>
  <v-tree-view
    class="layers-tree"
    item-key="name"
    item-children="layers"
    :items="layers.tree"
    :items-data="layersInfo"
    :expanded="expanded"
    :group-content-attrs="groupContentAttributes"
  >
    <template v-slot:group="{ group, depth }">
      <div v-if="group.virtual_layer" class="item group f-row-ac">
        <v-checkbox
          class="f-grow"
          :label="group.name"
          :value="group.visible"
          @input="setGroupVisibility(group, $event)"
        />
      </div>
      <div v-else class="item group f-row-ac" :depth="depth">
        <svg
          width="16"
          viewBox="0 0 16 16"
          role="button"
          class="toggle icon"
          :class="{expanded: expanded[group.name]}"
          @click="toggleGroup(group)"
        >
          <path d="M 8,1 L 8,15"/>
          <path class="tr" :d="expanded[group.name] ? 'M 8,8 L 8,8' : 'M 1,8 L 15,8'"/>
        </svg>
        <span class="label f-grow" v-text="group.name"/>
        <v-switch
          class="round"
          :value="group.visible"
          @input="setGroupVisibility(group, $event)"
        />
      </div>
    </template>
    <template v-slot:leaf="{ item, group, data }">
      <!-- <div class="f-col"> -->
        <div class="item layer f-row-ac" :class="{expanded: expandedLayer === item}">
          <v-checkbox
            v-if="item.drawing_order > -1"
            class="f-grow"
            :label="item.title || item.name"
            :value="item.visible"
            @input="setLayerVisibility(item, group, $event)"
          />
          <div v-else class="f-row-ac m-2 f-grow">
            <v-icon class="mr-2" name="map_off"/>
            <span v-text="item.title || item.name"/>
          </div>
          <!-- <span v-else class="p-2" v-text="item.title || item.name"/> -->
          <v-btn
            v-if="!attributeTableDisabled && item.queryable && item.attributes && item.attributes.length"
            :active="activeTool === 'attribute-table' && attributeTable.layer === item"
            class="icon flat small"
            :color="activeTool === 'attribute-table' && attributeTable.layer === item ? 'primary' : ''"
            :disabled="!item.visible && item.drawing_order > -1"
            @click="showAttributesTable(item)"
          >
            <v-icon name="attribute-table" size="12"/>
          </v-btn>
          <v-btn class="icon flat small" @click="toggleLayerInfo(item)">
            <v-icon
              class="toggle"
              name="arrow-down"
              size="12"
            />
            <!-- <v-icon
              class="toggle"
              name="arrow-down2"
              size="16"
            /> -->
          </v-btn>
        </div>
        <collapse-transition>
          <div
            v-if="expandedLayer === item"
            class="metadata f-col px-2 py-1"
          >
            <p>
              <translate class="label">Type</translate>
              <template v-if="item.type === 'VectorLayer'">
                <span v-text="data.type"/>
                <span class="px-2">
                  <v-icon :name="data.icon"/>
                  <v-tooltip>{{ item.wkb_type || item.geom_type }}</v-tooltip>
                </span>
              </template>
              <span v-else v-text="data.type"/>
            </p>
            <p>
              <translate class="label">Identification</translate>
              <v-icon :name="item.queryable ? 'check' : 'dash'"/>
            </p>
            <p v-if="item.metadata.abstract">
              <translate class="label">Abstract</translate>
              <span v-text="item.metadata.abstract"/>
            </p>
            <p v-if="item.metadata.data_url">
              <translate class="label">Data</translate>
              <a
                v-if="layersInfo[item.name].hasDataWebLink"
                :href="item.metadata.data_url"
                target="_blank"
              >
                <translate>Visit</translate>
                <v-icon name="globe" class="mx-1" color="primary"/>
              </a>
              <a
                v-else
                :href="item.metadata.data_url"
                target="_blank"
                download
              >
                <translate>Download</translate>
                <v-icon name="download" class="mx-1" color="primary"/>
              </a>
            </p>
          </div>
        </collapse-transition>
      <!-- </div> -->
    </template>
  </v-tree-view>
</template>

<script>
import { mapState } from 'vuex'

const VectorIcons = {
  NoGeometry: 'attribute-table',
  Point: 'point',
  PointZ: 'point',
  MultiPoint: 'point',
  MultiPointZ: 'point',
  LineString: 'line',
  LineStringZ: 'line',
  MultiLineString: 'line',
  MultiLineStringZ: 'line',
  Polygon: 'polygon',
  PolygonZ: 'polygon',
  MultiPolygon: 'polygon',
  MultiPolygonZ: 'polygon'
}

function geometryIcon (layer) {
   if (layer.type === 'VectorLayer') {
    // mix of new and old API
    return layer.wkb_type ? VectorIcons[layer.wkb_type] : layer.geom_type?.toLowerCase()
  }
  return ''
}

const webpageExtensions = ['html', 'htm', 'php', 'aspx', 'jsp']
function isWebpageLink (url) {
  const ext = url.split('.').pop().toLowerCase()
  return webpageExtensions.includes(ext)
}

export default {
  props: {
    attributeTableDisabled: Boolean,
    expanded: Object,
    layers: Object
  },
  data () {
    return {
      expandedGroups: {},
      expandedLayer: null
    }
  },
  computed: {
    ...mapState(['activeTool', 'attributeTable']),
    layersInfo () {
      const layerMetadata = l => ({
        icon: geometryIcon(l),
        type: l.type.replace('Layer', ''),
        hasDataWebLink: l.metadata.data_url && isWebpageLink(l.metadata.data_url)
      })
      return this.layers.list.reduce((res, l) => (res[l.name] = layerMetadata(l), res), {})
    }
  },
  methods: {
    toggleGroup (group) {
      // this.$set(this.expandedGroups, group.name, !this.expandedGroups[group.name])
      // this.$emit('expanded', group.name)
      this.$emit('update:expanded', { ...this.expanded, [group.name]: !this.expanded[group.name] })
    },
    toggleLayerInfo (layer) {
      this.expandedLayer = this.expandedLayer !== layer ? layer : null
    },
    setGroupVisibility (group, visible) {
      this.$store.commit('groupVisibility', { group, visible })
    },
    setLayerVisibility (layer, group, visible) {
      if (group?.mutually_exclusive) {
        const offLayers = group.layers.filter(l => l.visible && l !== layer)
        offLayers.forEach(l => this.$store.commit('layerVisibility', { layer: l, visible: false }))
      }
      this.$store.commit('layerVisibility', { layer, visible })
    },
    groupContentAttributes (item) {
      return { class: { disabled: !item.visible } }
    },
    showAttributesTable (layer) {
      this.$store.commit('attributeTable/layer', layer)
      this.$store.commit('activeTool', 'attribute-table')
    }
  }
}
</script>

<style lang="scss" scoped>
@import './layers-tree.scss';
</style>
