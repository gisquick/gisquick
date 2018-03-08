<template>
    <!-- Group Item -->
    <div
      v-if="layer.layers"
      class="group-container">
      <div
        class="item group"
        :depth="depth">
        <v-btn icon @click.stop="toggleCollapsed">
          <v-icon>{{ this.collapsed ? 'add' : 'remove' }}</v-icon>
        </v-btn>
        <label>{{ layer.title }}</label>
      </div>
      <v-collapsible
        v-show="!collapsed"
        :class="{disabled: !layer.visible}">
        <baselayer-item
          v-for="l in layer.layers"
          :key="l.title"
          :layer="l"
          :expanded="expanded"
          :depth="depth + 1"
          @changed:visibility="(value) => $emit('changed:visibility', value)"
          @expanded="(id) => $emit('expanded', id)" />
      </v-collapsible>
    </div>

    <!-- BaseLayer Item -->
    <div
      v-else-if="!layer.hidden"
      class="item-container"
      :class="{expanded: isExpanded}">
      <div class="item">
        <v-radio
          :label="layer.title || layer.name"
          :value="layer.name"
          color="primary"
          @change="$emit('changed:visibility', layer.name)">
        </v-radio>
        <v-btn
          icon
          class="expand"
          @click.stop="$emit('expanded', layer.name)">
            <v-icon>keyboard_arrow_down</v-icon>
        </v-btn>
      </div>
      <collapse-transition>
        <div v-if="isExpanded" class="metadata">
          <div class="pb-1" />

          <label>Abstract:</label>
          <span>{{ layer.metadata.abstract }}</span><br />

          <label>Keywords list:</label>
          <span>{{ layer.metadata.keyword_list }}</span><br />

  <!--           <label>Maximal scale:</label>
          <span> 1: {{ layer.visibility_scale_min }}</span><br /> -->
          <div class="pb-1" />
        </div>
      </collapse-transition>
    </div>

</template>

<script>
import Vue from 'vue'

export default Vue.component('baselayer-item', {
  props: ['layer', 'expanded', 'depth'],
  data: () => ({
    collapsed: false
  }),
  computed: {
    isExpanded () {
      return this.expanded === this.layer.name
    }
  },
  methods: {
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