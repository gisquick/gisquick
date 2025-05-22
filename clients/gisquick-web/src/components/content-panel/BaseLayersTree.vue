<template>
  <tree-list
    class="layers-tree"
    item-key="name"
    group-key="id"
    children-key="layers"
    :items="layers"
    :collapsed="collapsed"
    wrapper-class="hagl-wrapper"
    @update:collapsed="$emit('update:collapsed', $event)"
  >
    <template v-slot:group="{ item, open, depth, toggle }">
      <div class="item group f-row-ac" :depth="depth">
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
        <span class="label f-grow" v-text="item.name"/>
      </div>
    </template>
    <template v-slot:leaf="{ item }">
      <div class="item layer f-row-ac" :class="{expanded: expandedLayer === item}">
        <v-checkbox
          class="f-grow"
          :label="item.title || item.name"
          :value="value === item.name"
          @input="$emit('input', value === item.name ? null : item.name)"
        />
        <v-btn class="icon flat small" @click="toggleLayerInfo(item)">
          <v-icon
            class="toggle"
            name="arrow-down"
            size="12"
          />
        </v-btn>
      </div>
      <collapse-transition>
        <div v-if="expandedLayer === item" class="metadata px-2 py-1">
          <translate class="label">Abstract</translate>
          <span v-text="item.metadata.abstract"/>
          <br/>
          <translate class="label">Keywords list</translate>
          <span v-text="item.metadata.keyword_list"/>
          <br/>
          <!-- <translate class="label">Maximal scale</translate>
          <span> 1: {{ item.visibility_scale_min }}</span>
          <br/> -->
        </div>
      </collapse-transition>
    </template>
  </tree-list>
</template>

<script>
import TreeList from './TreeList.vue'

export default {
  components: { TreeList },
  props: {
    collapsed: Array,
    layers: Array,
    value: String
  },
  data () {
    return {
      expandedLayer: null
    }
  },
  methods: {
    toggleLayerInfo (layer) {
      this.expandedLayer = this.expandedLayer !== layer ? layer : null
    }
  }
}
</script>

<style lang="scss" scoped>
@import './layers-tree.scss';
</style>
