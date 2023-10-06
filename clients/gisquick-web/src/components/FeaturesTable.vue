<template>
  <div
    class="features-table light f-col"
    :class="{resizing}"
    :style="heightStyle"
  >
    <!-- Header -->
    <tabs-header :minimized.sync="minimized" @close="$emit('close')">
      <template slot="tabs">
        <a
          v-for="item in data"
          :key="item.layer.name"
          class="item"
          :class="{ active: layer === item.layer }"
          @click="setActiveLayer(item.layer)"
        >
          {{ item.layer.title }}
        </a>
      </template>
    </tabs-header>
    <div class="resize-area f-row-ac" @mousedown="resizeHandler"/>

    <!-- Table -->
    <switch-transition v-if="layer" class="table-wrapper f-col f-grow">
      <v-table
        class="f-grow"
        :key="layer.name"
        :columns="columns"
        item-key="_id"
        :items="tableData"
        :selected="selectedFeatureId"
        @row-click="selectFeature"
      >
        <template v-slot:cell(actions)="{ row }">
          <v-btn class="icon flat m-0" @click="zoomToFeature(features[row])">
            <v-icon name="zoom-to"/>
          </v-btn>
        </template>
        <template v-for="(slot, name) in slots" v-slot:[`cell(${name})`]="{ item }">
          <component
            :key="name"
            :is="slot.component"
            :attribute="slot.attribute"
            :value="item[name]"
          />
        </template>
      </v-table>
    </switch-transition>
  </div>
</template>

<script lang="js">
import clamp from 'lodash/clamp'
import keyBy from 'lodash/keyBy'
import { mapState } from 'vuex'

// import TabsHeader from '@/components/TabsHeader1.vue'
import TabsHeader from '@/components/TabsHeader.vue'
import {
  DateWidget, ValueMapWidget, BoolWidget, UrlWidget,
  createImageTableWidget, createMediaFileTableWidget, mediaUrlFormat
} from '@/components/GenericInfopanel.vue'
import { eventCoord, DragHandler } from '@/events'


const ActionsHeader = {
  text: '',
  key: 'actions',
  sortable: false,
  header: {
    width: 1
  }
}

function createColumn (field) {
  return {
    label: field.alias || field.name,
    key: field.name,
    align: 'left',
    sortable: false
  }
}

export default {
  components: { TabsHeader },
  props: {
    data: Array,
    selected: Object
  },
  data () {
    return {
      height: 210,
      minimized: false,
      resizing: false
    }
  },
  computed: {
    ...mapState(['project']),
    heightStyle () {
      // const height = this.height + 'px'
      const height = (this.minimized ? 1 : this.height) + 'px'
      return {
        height,
        // minHeight: height,
        // maxHeight: height
      }
    },
    layerFeatures () {
      // todo: solve updating after every selection change
      if (this.selected) {
        return this.data.find(i => i.layer.name === this.selected.layer)
      }
      return null
    },
    layer () {
      return this.layerFeatures?.layer
    },
    features () {
      return this.layerFeatures?.features
    },
    attributes () {
      if (this.layer?.attr_table_fields) {
        const attrsMap = keyBy(this.layer.attributes, 'name')
        return this.layer.attr_table_fields.map(name => attrsMap[name])
      }
      return this.layer?.attributes
    },
    columns () {
      if (this.attributes) {
        return [ActionsHeader, ...this.attributes.map(createColumn)]
      } else if (this.layer?.bands) {
        const fields = this.layer.bands.map(name => ({ name }))
        return fields.map(createColumn)
      }
      return []
    },
    tableData () {
      return this.features?.map(f => ({
        _id: f.getId(),
        ...f.getProperties(),
        ...f.getFormattedProperties()
      }))
    },
    selectedFeatureId () {
      return this.tableData?.[this.selected.featureIndex]._id
    },
    slots () {
      const slots = {}
      this.attributes?.forEach(attr => {
        let widget
        if (attr.widget === 'ValueMap') {
          widget = ValueMapWidget
        } else if (attr.widget === 'Hyperlink') {
          widget = UrlWidget
        } else if (attr.widget === 'Image') {
          widget = createImageTableWidget()
        } else if (attr.widget === 'MediaFile' || attr.widget === 'MediaImage') {
          widget = createMediaFileTableWidget(mediaUrlFormat(this.project.config.name, this.layer, attr))
        } else if (attr.type === 'date') { // and also attr.widget === 'DateTime' ?
          widget = DateWidget
        } else if (attr.type === 'bool') {
          widget = BoolWidget
        }
        if (widget) {
          slots[attr.name] = { component: widget, attribute: attr }
        }
      })
      return slots
    }
  },
  methods: {
    setActiveLayer (layer) {
      this.$emit('selection-change', { layer: layer.name, featureIndex: 0 }) // todo: use feature ID
    },
    selectFeature (item) {
      const featureIndex = this.tableData.indexOf(item)
      this.$emit('selection-change', { layer: this.selected.layer, featureIndex })
    },
    zoomToFeature (feature) {
      this.$map.ext.zoomToFeature(feature)
    },
    resizeHandler (e) {
      const originHeight = this.height
      const originY = eventCoord(e)[1]
      const maxHeight = window.innerHeight - 120
      DragHandler(e, {
        onStart: () => {
          this.resizing = true
        },
        onMove: e => {
          const y = eventCoord(e)[1]
          const offset = y - originY
          this.height = clamp(originHeight - offset, 0, maxHeight)
        },
        onEnd: () => {
          this.resizing = false
        }
      })
    }
  }
}
</script>

<style lang="scss" scoped>
.features-table {
  border-top: 1px solid #777;
  font-size: 14px;
  --icon-color: #555;
  // max-height: 242px;
  &:not(.resizing) {
    transition: height 0.4s cubic-bezier(.25,.8,.5,1);
  }
}
.table-container {
  align-self: stretch; // for fixed height
  pointer-events: auto;
  // box-shadow: 0 -5px 8px 0 rgba(0,0,0,.12), 0 -4px 4px -2px rgba(0,0,0,.18);
  box-shadow: 0 -4px 6px -1px rgba(0,0,0,.18);
  ::v-deep {
    table {
      border-bottom: 1px solid #ddd;
    }
    td {
      white-space: nowrap;
      max-width: 600px; // TODO: multiple sizes dependent by columns count
      text-overflow: ellipsis;
      overflow: hidden;
      a {
        color: var(--color-primary);
        text-decoration: none;
      }
    }
  }
}
.tabs-header {
  position: absolute;
  transform: translate(0, -100%);
}
.table-wrapper {
  pointer-events: auto;
  background-color: #fff;
  // box-shadow: 0 -5px 8px 0 rgba(0,0,0,.12), 0 -4px 6px -2px rgba(0,0,0,.18);
  box-shadow: 0 -4px 6px -1px rgba(0,0,0,.18);
  overflow: hidden;
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
.resize-area {
  pointer-events: auto;
  position: absolute;
  width: 100%;
  min-height: 10px;
  margin-top: -5px;
  cursor: row-resize;
  z-index: 10;
  user-select: none;
  // background-color: rgba(200,0,0,0.3);
  &::after {
    content: "";
    flex: 1;
    height: 2px;
    background-color: var(--color-primary);
    transition: opacity 0.3s cubic-bezier(.25,.8,.5,1);
    transition-delay: 0.1s;
    opacity: 0;
  }
  &:hover {
    &::after {
      opacity: 1;
    }
  }
}
.scroll-container {
  ::v-deep {
    .scrollbar-track.vertical {
      margin-top: 36px;
    }
  }
}
</style>
