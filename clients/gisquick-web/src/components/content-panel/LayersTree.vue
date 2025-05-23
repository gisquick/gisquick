<template>
  <tree-list
    item-key="name"
    group-key="id"
    children-key="layers"
    class="layers-tree"
    :class="{colored: !!colors}"
    :items="tree"
    :collapsed="collapsed"
    :inherited-attrs="groupAttrs"
    wrapper-class="hagl-wrapper"
    @update:collapsed="$emit('update:collapsed', $event)"
  >
    <template v-slot:group="{ item, parent, depth, open, toggle }">
      <div
        v-if="item.virtual_layer"
        :key="item.id"
        :ref="`_group-${item.id}`"
        class="item layer f-row-ac"
        :style="{ '--gl-color': colors && colors[parent.id] }"
      >
        <v-checkbox
          class="f-grow"
          :label="item.name"
          :value="item.visible"
          @input="setGroupVisibility(item, $event)"
        >
          <span v-if="highlight && highlight.group === item" slot="default" v-html="highlight.html"/>
          <span v-else-if="highlights && highlights[item.id]" slot="default" v-html="highlights[item.id]"/>
        </v-checkbox>
      </div>
      <div
        v-else
        :key="item.id"
        :ref="`_group-${item.id}`"
        class="item group f-row-ac"
        :class="{collapsed: !open}"
        :depth="depth"
        :style="{ '--gl-color': colors && colors[item.id] }"
      >
        <svg
          width="16"
          viewBox="0 0 16 16"
          role="button"
          class="toggle icon"
          :class="{expanded: open}"
          @click="toggle(item)"
        >
          <path d="M 8,1 L 8,15"/>
          <path class="tr" :d="open ? 'M 8,8 L 8,8' : 'M 1,8 L 15,8'"/>
        </svg>
        <span v-if="highlight && highlight.group === item" class="label f-grow" v-html="highlight.html"/>
        <span v-else class="label f-grow" v-text="item.name"/>
        <v-switch
          class="round"
          :value="item.visible"
          @input="setGroupVisibility(item, $event)"
        />
      </div>
    </template>
    <template v-slot:leaf="{ item, group }">
      <div
        :ref="item.name"
        class="item layer f-row-ac"
        :class="{expanded: expandedLayer === item}"
        :style="{ '--gl-color': colors && colors[group.id] }"
      >
        <v-checkbox
          v-if="item.drawing_order > -1"
          class="f-grow"
          :label="item.title || item.name"
          :value="item.visible"
          @input="setLayerVisibility(item, $event)"
        >
          <span v-if="highlights && highlights[item.name]" slot="default" v-html="highlights[item.name]"/>
        </v-checkbox>
        <div v-else class="f-row-ac m-2 f-grow">
          <v-icon class="mr-2" name="map_off"/>
          <span v-text="item.title || item.name"/>
        </div>
        <v-btn
          v-if="!attributeTableDisabled && item.queryable && item.attributes && item.attributes.length && (item.attr_table_fields && item.attr_table_fields.length > 0)"
          :active="activeTool === 'attribute-table' && attributeTable.layer === item"
          class="icon flat small"
          :color="activeTool === 'attribute-table' && attributeTable.layer === item ? 'primary' : ''"
          :disabled="!item.visible && item.drawing_order > -1"
          @click="showAttributesTable(item)"
        >
          <v-icon name="attribute-table" size="12"/>
        </v-btn>
        <v-icon v-else-if="item.queryable" name="circle-i-outline" size="16"/>
        <v-btn class="icon flat small" @click="toggleLayerInfo(item)">
          <v-icon
            class="toggle"
            name="arrow-down"
            size="12"
          />
        </v-btn>
      </div>
      <collapse-transition>
        <div
          v-if="expandedLayer === item"
          class="metadata f-col px-2 py-1"
        >
          <div class="f-row-ac">
            <translate class="label">Opacity</translate>
            <v-slider
              min="0"
              max="255"
              step="1"
              class="f-grow mx-2 my-0"
              marker-blend-color="#bbbbbbff"
              hide-range-labels
              :colors="opacityColors"
              :value="item.opacity"
              @input="setLayerOpacity(item, $event)"
            />
          </div>
          <p>
            <translate class="label">Type</translate>
            <template v-if="item.type === 'VectorLayer'">
              <span v-text="lmeta.type"/>
              <span class="px-2">
                <v-icon :name="lmeta.icon"/>
                <v-tooltip>{{ item.wkb_type || item.geom_type }}</v-tooltip>
              </span>
            </template>
            <span v-else v-text="lmeta.type"/>
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
    </template>
  </tree-list>
</template>

<script>
import { mapState } from 'vuex'
import { hexColor } from '@/ui/utils/colors'
import TreeList from './TreeList.vue'

import { textMatcher } from '@/ui/utils/text'

export function layersList (items) {
  const list = []
  items.forEach(item => {
    if (item.layers) {
      list.push(...layersList(item.layers))
    } else {
      list.push(item)
    }
  })
  return list
}

export function filterLayers (items, test) {
  const list = []
  items.forEach(item => {
    if (item.layers) {
      if (item.virtual_layer) {
        if (test(item)) {
          list.push(item)
        }
      } else {
        const children = filterLayers(item.layers, test)
        if (children.length) {
          list.push({
            ...item,
            layers: children
          })
        }
      }
    } else if (test(item)) {
      list.push(item)
    }
  })
  return list
}

export function layersGroups (items) {
  const list = []
  items.forEach(item => {
    if (item.layers) {
      list.push(item, ...layersGroups(item.layers))
    }
  })
  return list
}

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
  components: { TreeList },
  props: {
    attributeTableDisabled: Boolean,
    collapsed: Array,
    layers: Object,
    colors: Object,
    highlight: Object,
    filter: String,
    search: Object
  },
  data () {
    return {
      expandedLayer: null,
      profile: null
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
    },
    lmeta () {
      return this.expandedLayer ? this.layersInfo[this.expandedLayer.name] : null
    },
    opacityColors () {
      const color = getComputedStyle(document.body).getPropertyValue('--color-primary-rgb').split(',').map(Number)
      const colors = [hexColor(color) + '20', hexColor(color) + 'ff']
      return colors
    },
    filterMatcher () {
      return this.filter ? textMatcher(this.filter) : null
    },
    tree () {
      if (this.filterMatcher) {
        return filterLayers(this.layers.tree, n => this.filterMatcher.test(n.title || n.name))
      }
      return this.layers.tree
    },
    highlights () {
      const data = {}
      if (this.filterMatcher) {
        layersList(this.tree).forEach(l => {
          data[l.name] = this.filterMatcher.highlight(l.title)
        })
        layersGroups(this.tree).filter(g => g.virtual_layer).forEach(g => {
          data[g.id] = this.filterMatcher.highlight(g.name)
        })
      } else if (this.highlight?.layer) {
        data[this.highlight.layer.name] = this.highlight.html
      }
      return data
    }
  },
  watch: {
    highlight (highlight) {
      let el
      if (highlight?.layer) {
        el = this.$refs[highlight.layer.name]
      } else if (highlight?.group) {
        el = this.$refs[`_group-${highlight.group.id}`]
      }
      if (el) {
        setTimeout(() => el.scrollIntoView({ behavior: 'smooth', block: 'nearest' }))
      }
    }
  },
  methods: {
    toggleLayerInfo (layer) {
      this.expandedLayer = this.expandedLayer !== layer ? layer : null
    },
    setGroupVisibility (group, visible) {
      this.$store.commit('groupVisibility', { group, visible })
    },
    setLayerVisibility (layer, visible) {
      this.$store.commit('layerVisibility', { layer, visible })
    },
    showAttributesTable (layer) {
      this.$store.commit('attributeTable/layer', layer)
      this.$store.commit('activeTool', 'attribute-table')
    },
    setLayerOpacity (layer, opacity) {
      this.$store.commit('layerOpacity', { layer, opacity })
      this.$map.overlay.getSource().setLayerOpacity(layer.name, opacity)
    },
    groupAttrs (group) {
      if (!group.visible) {
        return { attrs: { disabled: true } }
      }
    }
  }
}
</script>

<style lang="scss" scoped>
@import './layers-tree.scss';
</style>
