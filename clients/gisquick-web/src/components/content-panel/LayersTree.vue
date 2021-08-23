<template>
  <v-tree-view
    class="layers-tree"
    item-key="name"
    item-children="layers"
    :items="layers"
    :expanded="expanded"
    :group-content-attrs="groupContentAttributes"
  >
    <template v-slot:group="{ item, depth }">
      <div class="item group f-row-ac" :depth="depth">
        <svg
          width="16"
          viewBox="0 0 16 16"
          role="button"
          class="toggle icon"
          :class="{expanded: expanded[item.name]}"
          @click="toggleGroup(item)"
        >
          <path d="M 8,1 L 8,15"/>
          <path class="tr" :d="expanded[item.name] ? 'M 8,8 L 8,8' : 'M 1,8 L 15,8'"/>
        </svg>
        <span class="label f-grow" v-text="item.name"/>
        <v-switch
          class="round"
          :value="item.visible"
          @input="setLayerVisibility(item, $event)"
        />
      </div>
    </template>
    <template v-slot:leaf="{ item }">
      <!-- <div class="f-col"> -->
        <div v-if="!item.hidden" class="item layer f-row-ac" :class="{expanded: expandedLayer === item}">
          <v-checkbox
            class="f-grow"
            :label="item.title || item.name"
            :value="item.visible"
            @input="setLayerVisibility(item, $event)"
          />
          <v-btn
            v-if="!attributeTableDisabled && item.queryable && item.attributes && item.attributes.length"
            :active="activeTool === 'attribute-table' && attributeTable.layer === item"
            class="icon flat small"
            :color="activeTool === 'attribute-table' && attributeTable.layer === item ? 'primary' : ''"
            :disabled="!item.visible"
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
            class="metadata px-2 py-1"
          >
            <translate class="label">Geometry</translate>
            <v-icon :name="item.geom_type ? item.geom_type.toLowerCase() : 'raster'"/>
            <br/>
            <translate class="label">Identification</translate>
            <v-icon :name="item.queryable ? 'check' : 'dash'"/>
            <br/>
            <translate class="label">Abstract</translate>
            <span>{{ item.metadata.abstract }}</span>
            <br/>
            <translate class="label">Keywords list</translate>
            <span>{{ item.metadata.keyword_list }}</span>
          </div>
        </collapse-transition>
      <!-- </div> -->
    </template>
  </v-tree-view>
</template>

<script>
import { mapState } from 'vuex'

export default {
  props: {
    attributeTableDisabled: Boolean,
    expanded: Object,
    layers: Array
  },
  data () {
    return {
      expandedGroups: {},
      expandedLayer: null
    }
  },
  computed: {
    ...mapState(['activeTool', 'attributeTable'])
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
    setLayerVisibility (layer, visible) {
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
