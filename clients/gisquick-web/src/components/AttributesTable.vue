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
    <v-table
      class="f-grow"
      :columns="columns"
      item-key="_id"
      :items="tableData"
      :loading="loading"
      :selected="selectedFeatureId"
      @row-click="selectFeature"
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
      <template v-slot:header(filter)="{ column }">
        <attribute-filter
          :attribute="column.attr"
          :label="column.label"
          :type="column.type"
          :filter="layerFilters[column.key]"
          @change="onFilterChange(column.key, $event)"
          @clear="clearFilter(column.key)"
        />
      </template>
      <template v-slot:cell(actions)="{ row }">
        <div class="f-row-ac">
          <v-btn class="icon flat m-0" @click="zoomToFeature(features[row])">
            <v-icon name="zoom-to"/>
          </v-btn>
          <v-btn class="icon flat my-0 mr-0" @click="showInfoPanel = true">
            <v-icon name="circle-i-outline"/>
          </v-btn>
        </div>
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
    <!-- <hr/> -->
    <!-- <div class="f-grow"/> -->

    <!-- Bottom toolbar -->
    <div class="f-row-ac bottom-panel px-2">
      <template v-if="pagination">
        <v-btn
          class="icon"
          :disabled="pagination.page === 1"
          @click="setPage(1)"
        >
          <v-icon name="first_page"/>
        </v-btn>
        <v-btn
          class="icon"
          :disabled="pagination.page === 1"
          @click="setPage(pagination.page - 1)"
        >
          <!-- <v-icon name="arrow-left"/> -->
          <v-icon name="navigate_before"/>
        </v-btn>
        <span v-text="paginationRangeText" class="mx-1"/>
        <v-btn
          class="icon"
          :disabled="pagination.page === lastPage"
          @click="setPage(pagination.page + 1)"
        >
          <v-icon name="navigate_next"/>
        </v-btn>
        <v-btn
          class="icon"
          :disabled="pagination.page === lastPage"
          @click="setPage(lastPage)"
        >
          <v-icon name="last_page"/>
        </v-btn>
        <div class="v-separator"/>
        <v-select
          class="inline filled"
          :label="tr.PageSize"
          :value="limit"
          :items="[5, 10, 20, 50]"
          @input="updateLimit"
        />
        <div class="v-separator"/>
        <v-btn
          v-if="permissions.insert"
          class="icon"
          @click="newFeatureMode = true"
        >
          <v-tooltip slot="tooltip">
            <translate>Add new feature</translate>
          </v-tooltip>
          <v-icon name="attribute-table-add"/>
        </v-btn>

      </template>
      <div class="f-grow"/>
      <v-checkbox
        color="primary"
        :label="tr.FilterVisibleLabel"
        :value="visibleAreaFilter"
        @input="$store.commit('attributeTable/visibleAreaFilter', $event)"
      />
      <v-btn
        slot="activator"
        class="icon"
        @click="clearAllFilters"
      >
        <v-tooltip slot="tooltip">
          <translate>Clear attributes filters</translate>
        </v-tooltip>
        <v-icon name="reset_filter"/>
      </v-btn>

      <v-btn
        color="primary"
        @click="fetchFeatures()"
      >
        <v-icon name="filter_list" class="mr-2" size="15"/>
        <translate>Filter</translate>
      </v-btn>
    </div>

    <features-viewer :features="features"/>
    <portal to="right-panel">
      <div
        v-if="newFeatureMode"
        class="window f-col mx-1 mb-2 shadow-2"
      >
        <div class="panel-header f-row-ac">
          <translate class="title mx-2 f-grow">New Feature</translate>
          <v-btn class="icon small" @click="newFeatureMode = false">
            <v-icon name="x"/>
          </v-btn>
        </div>
        <scroll-area>
          <new-feature-editor
            :layer="layer"
            toolbar-target="toolbar"
            @edit="newFeatureAdded"
          />
        </scroll-area>
        <portal-target name="toolbar" class="toolbar"/>
      </div>

      <info-panel
        v-else-if="showInfoPanel"
        class="mx-1 mb-2 shadow-2"
        :features="features"
        :layer="layer"
        :selected="infoPanelSelection"
        :editMode.sync="editMode"
        @selection-change="selectedFeatureIndex = $event.featureIndex"
        @close="showInfoPanel = false"
        @edit="onFeatureEdit"
        @delete="onFeatureEdit"
      />
    </portal>
  </div>
</template>

<script>
import clamp from 'lodash/clamp'
import keyBy from 'lodash/keyBy'
import isEqual from 'lodash/isEqual'
import { mapState, mapGetters, mapMutations } from 'vuex'
import Polygon from 'ol/geom/polygon'
import GeoJSON from 'ol/format/geojson'
// import TabsHeader from '@/components/TabsHeader1.vue'
import TabsHeader from '@/components/TabsHeader.vue'
import AttributeFilter from '@/components/AttributeFilter.vue'
import FeaturesViewer from '@/components/ol/FeaturesViewer.vue'
import NewFeatureEditor from '@/components/feature-editor/NewFeatureEditor.vue'
import InfoPanel from '@/components/InfoPanel.vue'
import { DateWidget, ValueMapWidget } from '@/components/GenericInfopanel.vue'
import { simpleStyle } from '@/map/styles'
import { layerFeaturesQuery } from '@/map/featureinfo'
// import { ShallowArray } from '@/utils'
import { eventCoord, DragHandler } from '@/events'


const ActionsHeader = {
  text: '',
  key: 'actions',
  sortable: false,
  header: {
    width: 1
  }
}

const SelectedStyle = simpleStyle({
  fill: [3, 169, 244, 0.4],
  stroke: [3, 169, 244, 0.9],
  strokeWidth: 3
})

export default {
  name: 'attribute-table',
  components: { TabsHeader, AttributeFilter, FeaturesViewer, InfoPanel, NewFeatureEditor },
  data () {
    return {
      loading: false,
      pagination: null,
      lastAttributesFilters: null,
      selectedFeatureIndex: null,
      showInfoPanel: false,
      newFeatureMode: false,
      editMode: false,
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
    },
    attributes () {
      if (this.layer.attr_table_fields) {
        const attrsMap = keyBy(this.layer.attributes, 'name')
        return this.layer.attr_table_fields.map(name => attrsMap[name])
      }
      return this.layer.attributes
    },
    columns () {
      if (this.attributes) {
        const columns = this.attributes.map(attr => ({
          attr,
          key: attr.name,
          header: {
            slot: 'filter'
          }
        }))
        return [ActionsHeader, ...columns]
      }
      return []
    },
    activeFilters () {
      return Object.entries(this.layerFilters)
        .filter(([_, filter]) => filter.active && filter.valid)
        .map(([name, filter]) => ({
          attribute: name,
          operator: filter.comparator,
          value: filter.value
        }))
    },
    tableData () {
      return this.features?.map(f => ({ _id: f.getId(), ...f.getProperties() }))
    },
    lastPage () {
      const { rowsPerPage, totalItems } = this.pagination
      return Math.ceil(totalItems / rowsPerPage)
    },
    paginationRangeText () {
      const { page, rowsPerPage, totalItems } = this.pagination
      if (totalItems === 0) {
        return '-'
      }
      const sIndex = (page - 1) * rowsPerPage + 1
      const eIndex = Math.min(sIndex + rowsPerPage - 1, totalItems)
      return `${sIndex} - ${eIndex} of ${totalItems}`
    },
    tr () {
      return {
        FilterVisibleLabel: this.$gettext('Filter to visible area'),
        PageSize: this.$gettext('Page size')
      }
    },
    selectedFeature () {
      return this.features[this.selectedFeatureIndex]
    },
    selectedFeatureId () {
      return this.selectedFeature?.getId()
    },
    infoPanelSelection () {
      return this.selectedFeature && {
        layer: this.layer.name,
        featureIndex: this.selectedFeatureIndex
      }
    },
    permissions () {
      return this.layer.permissions || {}
    },
    slots () {
      const slots = {}
      this.attributes.forEach(attr => {
        let widget
        if (attr.widget === 'ValueMap') {
          widget = ValueMapWidget
        } else if (attr.type === 'date') { // and also attr.widget === 'DateTime' ?
          widget = DateWidget
        }
        if (widget) {
          slots[attr.name] = { component: widget, attribute: attr }
        }
      })
      return slots
    }
  },
  watch: {
    layer: {
      immediate: true,
      handler (layer) {
        if (layer) {
          this.fetchFeatures()
        }
      }
    },
    selectedFeature (feature, oldFeature) {
      if (oldFeature) {
        oldFeature.setStyle(null)
      }
      if (feature) {
        feature.setStyle(SelectedStyle)
      }
    },
    activeFilters (val, old) {
      if (!isEqual(val, old)) {
        // console.log('activeFilters:watch', JSON.stringify(old), JSON.stringify(val))
        this.fetchFeatures()
      }
      // console.log('activeFilters:watch', JSON.stringify(old), JSON.stringify(val))
    }
  },
  methods: {
    ...mapMutations('attributeTable', ['updateFilter', 'clearFilter']),
    async fetchFeatures (page = 1, lastQuery = false) {
      const mapProjection = this.$map.getView().getProjection().getCode()
      let query
      if (lastQuery) {
        query = this.pagination.query
      } else {
        let geom = null
        if (this.visibleAreaFilter) {
          geom = Polygon.fromExtent(this.$map.ext.visibleAreaExtent()).transform(mapProjection, this.layer.projection)
        }
        this.lastAttributesFilters = Object.entries(this.layerFilters)
          // .filter(([name, filter]) => filter.comparator && filter.value !== null)
          .filter(([name, filter]) => filter.active && filter.comparator && filter.valid)
          .map(([name, filter]) => ({
            attribute: name,
            operator: filter.comparator,
            value: filter.value
          }))
        // console.log(JSON.stringify(this.lastAttributesFilters))
        query = layerFeaturesQuery(this.layer, geom, this.lastAttributesFilters)
        // console.log(query)
      }

      const baseParams = {
        VERSION: '1.1.0',
        SERVICE: 'WFS',
        REQUEST: 'GetFeature',
        OUTPUTFORMAT: 'GeoJSON'
      }

      const headers = { 'Content-Type': 'text/xml' }
      let geojson, featuresCount
      this.loading = true
      try {
        let params = { ...baseParams, resultType: 'hits' }
        let resp = await this.$http.post(this.project.config.ows_url, query, { params, headers })
        // fix invalid geojson from QGIS server (missing ',')
        featuresCount = JSON.parse(resp.data.replace(/"\n/g, '",\n')).numberOfFeatures

        params = {
          ...baseParams,
          STARTINDEX: (page - 1) * this.limit,
          MAXFEATURES: this.limit
        }
        resp = await this.$http.post(this.project.config.ows_url, query, { params, headers })
        geojson = resp.data
      } catch (e) {
        console.error(e)
        return
      } finally {
        this.loading = false
      }

      const parser = new GeoJSON()

      // const features = ShallowArray(parser.readFeatures(geojson, { featureProjection: mapProjection }))
      const features = Object.freeze(parser.readFeatures(geojson, { featureProjection: mapProjection }))

      const selectedIndex = this.selectedFeature ? features.findIndex(f => f.getId() === this.selectedFeature.getId()) : -1
      this.selectedFeatureIndex = selectedIndex !== -1 ? selectedIndex : 0
      this.$store.commit('attributeTable/features', features)

      this.pagination = {
        query,
        page,
        rowsPerPage: this.limit,
        totalItems: featuresCount
      }
    },
    setPage (page) {
      this.fetchFeatures(page, true)
    },
    zoomToFeature (feature) {
      this.$map.ext.zoomToFeature(feature)
    },
    newFeatureAdded () {
      setTimeout(() => {
        this.newFeatureMode = false
      }, 1500)
      this.fetchFeatures(this.pagination.page, true)
      this.$map.ext.refreshOverlays()
    },
    clearAllFilters () {
      Object.entries(this.layerFilters).forEach(([name, filter]) => {
        if (filter.comparator !== null || filter.value !== null) {
          this.clearFilter(name)
        }
      })
    },
    onFilterChange (attr, filter) {
      // console.log('onFilterChange', attr, filter)
      const current = this.layerFilters[attr]
      this.updateFilter({ layer: this.layer.name, attr, filter })
    },
    selectFeature (item) {
      this.selectedFeatureIndex = this.tableData.indexOf(item)
    },
    updateLimit (value) {
      this.$store.commit('attributeTable/limit', value)
      this.fetchFeatures(1, true)
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
    },
    onFeatureEdit () {
      this.$map.ext.refreshOverlays()
      this.fetchFeatures(this.pagination.page, true)
    }
  }
}
</script>

<style lang="scss" scoped>
.attribute-table {
  font-size: 14px;
  --icon-color: #555;
  // max-height: 242px;
  &:not(.resizing) {
    transition: height 0.4s cubic-bezier(.25,.8,.5,1);
  }
}
.table-container {
  pointer-events: auto;
  border-top: 1px solid #777;
  // box-shadow: 0 -5px 8px 0 rgba(0,0,0,.12), 0 -4px 4px -2px rgba(0,0,0,.18);
  box-shadow: 0 -4px 6px -1px rgba(0,0,0,.18);
  ::v-deep {
    table {
      border-bottom: 1px solid #ddd;
    }
    thead th[role="columnheader"] {
      height: 39px;
      padding-block: 5px;
    }
    td {
      white-space: nowrap;
      max-width: 600px; // TODO: multiple sizes dependent by columns count
      text-overflow: ellipsis;
      overflow: hidden;
    }
  }
}
.bottom-panel {
  height: 36px;
  background-color: #fff;
  // background-color: #f3f3f3;
  background-color: #fafafa;
  // background-image: linear-gradient(#fff, #fff);
  // background-color: rgba(var(--color-primary-rgb), 0.1);
  // background-image: linear-gradient(rgba(var(--color-primary-rgb), 0.1), transparent);
  // background-image: linear-gradient(transparent, rgba(var(--color-primary-rgb), 0.08));
  background-image: linear-gradient(rgba(#333, 0.06), transparent 85%, rgba(#333, 0.06));
  border-top: 1px solid #ccc;
  pointer-events: auto;
  font-size: 13px;

  .btn {
    max-height: 28px;
    &.icon {
      width: 24px;
      height: 24px;
      margin: 2px;
    }
  }
  .i-field ::v-deep .input {
    height: 24px;
  }
}
.info-panel {
  flex: 0 1 auto;
}
.window {
  overflow: hidden;
  width: 20em;
  border-radius: 3px;
  border: 1px solid #aaa;
  background-color: #fff;
  position: relative;
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
.scroll-container {
  ::v-deep {
    .scrollbar-track.vertical {
      margin-top: 40px;
    }
  }
}
</style>
