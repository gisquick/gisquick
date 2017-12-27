<template>
    <!-- Group Item -->
    <div
      v-if="layer.layers"
      class="group-container">
      <div
        class="item group"
        :depth="depth">
        <v-btn
          icon
          @click.stop="toggleCollapsed">
          <v-icon>{{ this.collapsed ? 'add' : 'remove' }}</v-icon>
        </v-btn>
        <label>{{ layer.title }}</label>
        <v-switch
          v-model="layer.visible"
          color="primary"
          @change="toggleGroupVisibility"
          hide-details />
      </div>
      <Collapsible>
        <div
          v-show="!collapsed"
          :class="{disabled: !layer.visible}">
          <layer-item
            v-for="l in layer.layers"
            :key="l.title"
            :layer="l"
            :expanded="expanded"
            :depth="depth + 1"
            @changed:visibility="$emit('changed:visibility')"
            @expanded="(id) => $emit('expanded', id)" />
        </div>
      </Collapsible>
    </div>

    <!-- Layer Item -->
    <div
      v-else-if="!layer.hidden"
      class="item-container"
      :class="{expanded: isExpanded}">
      <div class="item">
        <v-checkbox
          color="primary"
          v-model="layer._visible"
          :label="layer.title || layer.name"
          @change="$emit('changed:visibility')"
          hide-details>
        </v-checkbox>
        <v-btn
          icon
          class="expand"
          @click.stop="$emit('expanded', layer.name)">
            <v-icon>keyboard_arrow_down</v-icon>
        </v-btn>
      </div>
      <Collapsible>
        <div v-if="isExpanded" class="metadata">
          <label>Geometry:</label>
          <icon :name="layer.geom_type? layer.geom_type.toLowerCase() : 'raster'" /><br />
          
          <label>Identification:</label>
          <icon :name="layer.queryable? 'check' : 'dash'" /><br />
          
          <label>Abstract:</label>
          <span>{{ layer.metadata.abstract }}</span><br />
          
          <label>Keywords list:</label>
          <span>{{ layer.metadata.keyword_list }}</span><br />

<!--           <label>Maximal scale:</label>
          <span> 1: {{ layer.visibility_scale_min }}</span><br /> -->
        </div>
      </Collapsible>
    </div>

</template>

<script>
import Vue from 'vue'
import Collapsible from '../Collapsible'

export default Vue.component('layer-item', {
  props: ['layer', 'expanded', 'depth'],
  components: { Collapsible },
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
    toggleGroupVisibility () {
      this.$emit('changed:visibility')
    },
    toggleCollapsed () {
      this.collapsed = !this.collapsed
    }
  }
})

</script>

<style lang="scss">
@import '../../theme.scss';
.layers-list {

  /* Fixes checkbox position in FF */
  .icon--selection-control {
    top: 0;
  }
  .input-group.radio {
    padding-left: 2px;
    label {
      font-size: 0.938rem;
      color: #333;
    }
  }

  .item-container {
    padding-left: 4px;
    .item {
      position: relative;
      .btn.expand {
        position: absolute;
        top: 0;
        right: 0;
        margin: 0;
        height: 100%;
        opacity: 0.5;
      }
      label {
        font-size: 0.938rem;
        color: #333;
      }
    }
    .metadata {
      font-size: 80%;
      padding-bottom: 0.25em;
      label {
        font-weight: 600;
      }
      .icon {
        width: 0.75em;
        height: 0.75em;
      }
    }
    &.expanded {
      .item {
        background-color: rgba($primary-color, 0.2);
        .btn.expand .icon {
          transform: rotateZ(180deg);
        }
      }
      .metadata {
        background-color: rgba($primary-color, 0.1);
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
      .btn {
        width: 2.5em;
        margin: 0;
        height: 100%;
      }
      label {
        font-size: 0.938rem;
        font-weight: 600;
        color: #333;
      }
      .switch {
        overflow: hidden;
        position: absolute;
        top: 0;
        right: 0;
        width: 2.5em;
        height: inherit;
        .input-group--selection-controls__toggle {
          width: 28px;
          height: 16px;
          border-radius: 5px;
          opacity: 1;
        }
        .input-group--selection-controls__ripple {
          height: 2.25em;
          transform: translate(-16px,-18px);
          &.input-group--selection-controls__ripple--active {
            transform: translate(-4px,-18px);
          }
          &:after {
            width: 13px;
            height: 13px;
            border-radius: 4px;
            color: #fff;
            box-shadow: none;
          }
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