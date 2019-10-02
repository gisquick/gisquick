<template>
  <div>
    <!-- Header -->
    <tabs-header @close="$emit('close')">
      <template slot="tabs">
        <a
          v-for="item in data"
          :key="item.layer.name"
          :class="{ active: layer === item.layer }"
          @click="setActiveLayer(item.layer)"
        >
          {{ item.layer.title }}
        </a>
      </template>
    </tabs-header>

    <!-- Table -->
    <div class="table-container" v-if="layer">
      <!-- <transition name="tabslide"> -->
      <switch-transition>
        <v-data-table
          :key="layer.name"
          :headers="headers"
          :items="features"
          hide-actions
        >
          <template slot="items" slot-scope="props">
            <tr
              :class="{selected: selected && selected.featureIndex === props.index}"
              @click="selectFeature(props.index)"
            >
              <td
                class="icon px-3"
                @click="zoomToFeature(props.item)"
              >
                <icon name="zoom-to"/>
              </td>
              <td v-for="attr in layer.attributes" :key="attr.name">
                {{ props.item.get(attr.name) }}
              </td>
            </tr>
          </template>
        </v-data-table>
      </switch-transition>
      <!-- </transition> -->
    </div>
  </div>
</template>

<script>
import TabsHeader from './TabsHeader'

const zoomToHeader = {
  text: '',
  value: '',
  sortable: false,
  width: 1
}

export default {
  components: { TabsHeader },
  props: {
    data: Array,
    selected: Object
  },
  computed: {
    layerFeatures () {
      if (this.selected) {
        return this.data.find(i => i.layer.name === this.selected.layer)
      }
      return null
    },
    layer () {
      return this.layerFeatures && this.layerFeatures.layer
    },
    features () {
      return this.layerFeatures && this.layerFeatures.features
    },
    headers () {
      if (this.layer) {
        const columns = this.layer.attributes.map(attr => ({
          text: attr.alias || attr.name,
          value: attr.name,
          align: 'left',
          sortable: false
        }))
        return [zoomToHeader].concat(columns)
      }
      return []
    }
  },
  methods: {
    setActiveLayer (layer) {
      this.$emit('selection-change', { layer: layer.name, featureIndex: 0 })
    },
    selectFeature (featureIndex) {
      this.$emit('selection-change', { layer: this.selected.layer, featureIndex })
    },
    zoomToFeature (feature) {
      this.$map.ext.zoomToFeature(feature)
    }
  }
}
</script>

<style lang="scss" scoped>
.table-container {
  pointer-events: auto;
  background-color: #fff;
  box-shadow: 0 -5px 8px 0 rgba(0,0,0,.12), 0 -4px 4px -2px rgba(0,0,0,.18);
}
/deep/ table.v-table {
  thead {
    tr {
      height: 2em;
      background-color: #ddd;
      th {
        background-color: #ddd;
        position: sticky;
        top: 0;
      }
    }
  }
  tbody {
    tr {
      &.selected {
        background-color: rgba(3,169,244, 0.25)!important;
      }
    }
    td {
      height: 2.5em;
      white-space: nowrap;
      max-width: 500px;
      overflow: hidden;
      text-overflow: ellipsis;
      &.icon {
        cursor: pointer;
        .icon {
          display: block;
          width: 1.5em;
          height: 1.5em;
          color: #777;
        }
      }
    }
  }
}

.tabslide-enter, .tabslide-leave-to {
  opacity: 0;
}
.tabslide-enter-active, .tabslide-leave-active {
  transition: all 0.5s cubic-bezier(.25,.8,.5,1);
}
.tabslide-enter, .tabslide-leave-to {
  transform: translate3d(300px, 0, 0);
}
.tabslide-leave-active {
  position: absolute;
}
</style>
