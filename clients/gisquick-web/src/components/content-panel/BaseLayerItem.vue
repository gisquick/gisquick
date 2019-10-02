<template>
    <!-- Group Item -->
    <div
      v-if="layer.layers"
      class="group-container"
    >
      <div
        class="item group layout row"
        :depth="depth"
      >
        <v-btn icon @click.stop="toggleCollapsed">
          <v-icon>{{ this.collapsed ? 'add' : 'remove' }}</v-icon>
        </v-btn>
        <label>{{ layer.title || layer.name }}</label>
      </div>
      <v-collapsible
        v-show="!collapsed"
        :class="{disabled: !layer.visible}"
      >
        <base-layer-item
          v-for="l in layer.layers"
          :key="l.name"
          :layer="l"
          :expanded="expanded"
          :depth="depth + 1"
          @expanded="$emit('expanded', $event)"
        />
      </v-collapsible>
    </div>

    <!-- BaseLayer Item -->
    <div
      v-else-if="!layer.hidden"
      class="item-container"
      :class="{expanded: isExpanded}"
    >
      <div class="item layout row">
        <v-radio
          :label="layer.title || layer.name"
          :value="layer.name"
          color="primary"
          class="flex"
          @change="setBaseLayer"
        />
        <v-btn
          icon
          class="expand"
          @click.stop="$emit('expanded', layer.name)"
        >
          <icon name="arrow-down"/>
        </v-btn>
      </div>
      <collapse-transition>
        <div v-if="isExpanded" class="metadata">
          <div class="pb-1"/>

          <label><translate>Abstract</translate>: </label>
          <span>{{ layer.metadata.abstract }}</span><br/>

          <label><translate>Keywords list</translate>: </label>
          <span>{{ layer.metadata.keyword_list }}</span><br/>

  <!--           <label>Maximal scale:</label>
          <span> 1: {{ layer.visibility_scale_min }}</span><br /> -->
          <div class="pb-1"/>
        </div>
      </collapse-transition>
    </div>

</template>

<script>
import Vue from 'vue'

export default Vue.component('base-layer-item', {
  props: {
    layer: Object,
    expanded: String,
    depth: Number
  },
  data () {
    return {
      collapsed: false
    }
  },
  computed: {
    isExpanded () {
      return this.expanded === this.layer.name
    }
  },
  methods: {
    setBaseLayer (layername) {
      this.$store.commit('visibleBaseLayer', layername)
    },
    toggleCollapsed () {
      this.collapsed = !this.collapsed
    }
  }
})

</script>

<style lang="scss">
.content-panel {
  .item-container {
    .metadata {
      label {
        font-size: 0.813rem;
        color: #333;
        height: auto;
        line-height: 1;
      }
    }
  }
}
</style>
