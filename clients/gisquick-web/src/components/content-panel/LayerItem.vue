<template>
    <!-- Group Item -->
    <div
      v-if="layer.layers"
      class="group-container"
    >
      <div
        class="item group"
        :depth="depth"
      >
        <v-btn icon @click.stop="toggleCollapsed">
          <v-icon>{{ this.collapsed ? 'add' : 'remove' }}</v-icon>
        </v-btn>
        <label>{{ layer.title || layer.name }}</label>
        <v-switch
          color="primary"
          :input-value="layer.visible"
          @change="setLayerVisibility"
          hide-details
        />
      </div>
      <v-collapsible
        v-show="!collapsed"
        :class="{disabled: !layer.visible}"
      >
        <layer-item
          v-for="l in layer.layers"
          :key="l.name"
          :layer="l"
          :expanded="expanded"
          :depth="depth + 1"
          @expanded="$emit('expanded', $event)"
        />
      </v-collapsible>
    </div>

    <!-- Layer Item -->
    <div
      v-else-if="!layer.hidden"
      class="item-container"
      :class="{expanded: isExpanded}"
    >
      <v-layout class="item row align-center px-1">
        <v-checkbox
          color="primary"
          :label="layer.title || layer.name"
          :input-value="layer.visible"
          @change="setLayerVisibility"
          hide-details
        />
        <v-btn
          v-if="layer.attributes"
          :color="isAttributeTableActive ? 'primary' : ''"
          @click="showAttributesTable(layer)"
          flat icon
        >
          <icon name="attribute-table"/>
        </v-btn>
        <v-btn
          icon
          class="expand"
          @click.stop="$emit('expanded', layer.name)"
        >
          <icon name="arrow-down"/>
        </v-btn>
      </v-layout>
      <collapse-transition>
        <div v-if="isExpanded" class="metadata">
          <div class="pb-1"/>
          <label><translate>Geometry</translate>: </label>
          <icon :name="layer.geom_type ? layer.geom_type.toLowerCase() : 'raster'"/>
          <br/>

          <label><translate>Identification</translate>: </label>
          <icon :name="layer.queryable ? 'check' : 'dash'"/>
          <br/>

          <label><translate>Abstract</translate>: </label>
          <span>{{ layer.metadata.abstract }}</span>
          <br/>

          <label><translate>Keywords list</translate>: </label>
          <span>{{ layer.metadata.keyword_list }}</span>
          <br/>

  <!--           <label>Maximal scale:</label>
          <span> 1: {{ layer.visibility_scale_min }}</span><br/> -->
          <div class="pb-1"/>
        </div>
      </collapse-transition>
    </div>

</template>

<script>
import Vue from 'vue'

export default Vue.component('layer-item', {
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
    },
    isAttributeTableActive () {
      const { activeTool, attributeTable } = this.$store.state
      return activeTool === 'attribute-table' && attributeTable.layer === this.layer
    }
  },
  methods: {
    toggleCollapsed () {
      this.collapsed = !this.collapsed
    },
    setLayerVisibility (visible) {
      this.$store.commit('layerVisibility', { layer: this.layer, visible })
    },
    showAttributesTable (layer) {
      this.$store.commit('attributeTable/layer', layer)
      this.$store.commit('activeTool', 'attribute-table')
    }
  }
})

</script>

<style lang="scss">
@import '../../theme.scss';

.content-panel {

  /* Fixes checkbox position in FF */
  .icon--selection-control {
    top: 0;
  }

  .v-input--radio-group {
    margin-top: 0;
    .v-radio {
      padding-left: 2px;
      margin-bottom: 0;
      height: 2em;
      label {
        font-size: 0.938rem;
        color: #333;
      }
    }
  }
  .item-container {
    .item {
      .v-btn {
        margin: 0;
        opacity: 0.45;
        height: 2em;
        width: 1.85em;
        .icon {
          width: 12px;
          height: 12px;
        }
      }
      label {
        font-size: 0.938rem;
        color: #333;
      }
      .v-input--checkbox {
        label {
          flex-grow: 1;
        }
      }
    }
    .metadata {
      font-size: 0.813em;
      padding-left: 4px;
      label {
        font-weight: 600;
      }
      .icon {
        width: 1em;
        height: 1em;
      }
    }
    .v-btn.expand .icon {
      transition: transform 0.3s ease;
    }
    &.expanded {
      .item {
        background-color: rgba($primary-color, 0.15);
        .v-btn.expand .icon {
          transform: rotateZ(180deg);
        }
      }
      .metadata {
        background-color: rgba($primary-color, 0.05);
      }
    }
  }
  .group-container {
    .group {
      position: relative;
      display: flex;
      align-items: center;
      height: 2em;
      &[depth="1"] {
        background-color: #bbb;
      }
      &[depth="2"] {
        background-color: #ddd;
        border: solid #bbb;
        border-width: 1px 0;
      }
      .v-btn {
        width: 2.5em;
        margin: 0;
        height: 100%;
      }
      label {
        font-size: 0.938rem;
        font-weight: 600;
        color: #333;
      }
      .v-input--switch {
        position: absolute;
        top: 0;
        right: 0;
        margin-top: 0;
        .v-input--switch__track {
          top: 4px;
          width: 31px;
          height: 16px;
          border-radius: 5px;
          opacity: 1;
        }
        .v-input--switch__thumb {
          border-radius: 4px;
          width: 13px;
          height: 14px;
          top: 5px;
          left: 3px;
          color: #fff!important;
          box-shadow: none;
        }
        .v-input--selection-controls__ripple {
          left: -18px;
        }
        input {
          width: 36px;
          height: 24px;
        }
      }
    }
    .disabled .item {
      opacity: 0.5;
      pointer-events: none;
    }
  }
}
</style>
