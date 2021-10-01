<template>
  <v-tree-view
    class="layers-tree"
    :items="layers"
    :expanded="expanded"
    item-key="name"
    item-children="layers"
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
      </div>
    </template>
    <template v-slot:leaf="{ item }">
      <div class="item layer f-row-ac" :class="{expanded: expandedLayer === item}">
        <v-radio-btn
          class="f-grow"
          :label="item.title || item.name"
          :val="item.name"
          :value="value"
          @input="$emit('input', item.name)"
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
  </v-tree-view>
</template>

<script>
export default {
  props: {
    expanded: Object,
    layers: Array,
    value: String
  },
  data () {
    return {
      expandedGroups: {},
      expandedLayer: null
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
    }
  }
}
</script>

<style lang="scss" scoped>
@import './layers-tree.scss';
</style>
