<template>
  <div
    class="attribute-table light f-col"
    :class="{resizing}"
    :style="heightStyle"
  >
    <!-- Header -->
    <tabs-header :minimized.sync="minimized" @close="$emit('close')">
      <a slot="tabs" class="item xactive">
        {{ layer.title }}
      </a>
    </tabs-header>
    <div class="resize-area f-row-ac" @mousedown="resizeHandler"/>
    <!-- Table -->
    <attributes-table
      ref="table"
      class="f-grow"
      fetch-relations
      :project="project"
      :layer="layer"
      :filters="layerFilters"
      :features="features"
      :limit="limit"
      :visible-area-filter="visibleAreaFilter"
      :selected-id="selected && selected.id"
      :pagination.sync="pagination"
      :sort-by.sync="sortBy"
      @update:features="updateFeatures"
      @update:limit="updateLimit"
      @update:visibleAreaFilter="updateVisibleAreaFilter"
      @update:filters="updateFilters"
      @update:selectedId="updateSelection"
    >
      <template v-slot:header(actions)>
        <!-- <v-menu>
          <template v-slot:activator="{ toggle }">
            <v-btn class="icon flat m-0" @click="toggle">
              <v-icon name="menu"/>
            </v-btn>
          </template>
        </v-menu> -->
      </template>
      <template v-slot:actions="{ row, item }">
        <v-btn class="icon flat my-0 mr-0" @click="[mode = 'view', showInfoPanel = true]">
          <v-icon name="circle-i-outline"/>
        </v-btn>
      </template>

      <template v-slot:toolbar>
        <div class="v-separator"/>
        <v-btn
          v-if="permissions.insert"
          class="icon"
          @click="[mode = 'add', showInfoPanel = true]"
        >
          <v-tooltip slot="tooltip">
            <translate>Add new feature</translate>
          </v-tooltip>
          <v-icon name="attribute-table-add"/>
        </v-btn>
        <v-btn
          v-if="attributesToExport.length"
          color="primary"
          :disabled="!attributesToExport.length"
          @click="exportFeatures"
        >
          <v-icon name="download" size="14" class="mr-2"/>
          <translate>Export</translate>
        </v-btn>
      </template>
    </attributes-table>

    <portal to="right-panel">
      <info-panel
        v-if="showInfoPanel"
        class="mx-1 mb-2"
        :features="features"
        :layer="layer"
        :mode.sync="mode"
        :selected.sync="selected"
        @close="showInfoPanel = false"
        @insert="onFeatureInsert"
        @edit="onFeatureEdit"
        @delete="onFeatureDelete"
      />
    </portal>
  </div>
</template>

<script>
import clamp from 'lodash/clamp'
import { mapState, mapGetters, mapMutations } from 'vuex'
// import TabsHeader from '@/components/TabsHeader1.vue'
import TabsHeader from '@/components/TabsHeader.vue'
import AttributesTable from './TableView.vue'
import InfoPanel from '@/components/InfoPanel.vue'

import { eventCoord, DragHandler } from '@/events'
import ToolMixin from './tool.js'

export default {
  name: 'attribute-table-tool',
  mixins: [ToolMixin],
  components: { TabsHeader, InfoPanel, AttributesTable },
  data () {
    return {
      height: 242,
      minimized: false,
      resizing: false
    }
  },
  computed: {
    ...mapState(['project']),
    ...mapState('attributeTable', ['page', 'limit', 'visibleAreaFilter', 'layer', 'features']),
    ...mapGetters('attributeTable', ['layerFilters']),
    heightStyle () {
      const height = (this.minimized ? 37 : this.height) + 'px'
      return {
        height,
        // minHeight: height,
        // maxHeight: height
      }
    }
  },
  methods: {
    updateSelection (id) {
      this.selected = { layer: this.layer.name, id }
    },
    fetchFeatures (page = 1, lastQuery = false) {
      this.$refs.table.fetchFeatures(page, lastQuery)
    },
    resizeHandler (e) {
      if (this.minimized) {
        return
      }
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
.attribute-table {
  // max-height: 242px;
  overflow: hidden;
  &:not(.resizing) {
    transition: height 0.4s cubic-bezier(.25,.8,.5,1);
  }
}
.info-panel {
  flex: 0 1 auto;
}
.tabs-header {
  position: absolute;
  transform: translate(0, -100%);
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
</style>
