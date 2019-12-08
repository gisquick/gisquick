<template>
  <v-layout column>
    <!-- Header -->
    <tabs-header @close="$emit('close')">
      <a slot="tabs" class="active">
        {{ layer.title }}
      </a>
    </tabs-header>

    <!-- Table -->
    <v-data-table
      class="table-container"
      :headers="headers"
      :items="features"
      :loading="loading"
      hide-actions
    >
      <template slot="headerCell" slot-scope="{ header }">
        <span v-if="header.blank"/>
        <attribute-filter
          v-else
          :label="header.text"
          :type="header.type"
          :filter="layerFilters[header.value]"
          @input:comparator="updateFilterComparator({ attr: header.value, comparator: $event })"
          @input:value="updateFilterValue({ attr: header.value, value: $event })"
          @update:error="updateFilterValidity({ attr: header.value, valid: !$event })"
          @input:enter="fetchFeatures()"
          @clear="clearFilter(header.value)"
        />
      </template>
      <template slot="items" slot-scope="{ item, index }">
        <tr
          @click="selectedFeatureIndex = index"
          :class="{selected: selectedFeature === item}"
        >
          <td
            class="icon pl-3 pr-2"
            @click="zoomToFeature(item)"
          >
            <icon name="zoom-to"/>
          </td>
          <td
            class="icon pl-2 pr-0"
            @click="showInfoPanel = true"
          >
            <icon name="circle-i-outline"/>
          </td>
          <td v-for="attr in layer.attributes" :key="attr.name">
            {{ item.get(attr.name) }}
          </td>
        </tr>
      </template>
    </v-data-table>
    <v-layout class="row align-center bottom-panel pl-1">
      <template v-if="pagination">
        <v-btn
          icon
          class="mx-1 my-0"
          :disabled="pagination.page === 1"
          @click="setPage(1)"
        >
          <v-icon>first_page</v-icon>
        </v-btn>
        <v-btn
          icon
          class="mx-1 my-0"
          :disabled="pagination.page === 1"
          @click="setPage(pagination.page - 1)"
        >
          <v-icon>navigate_before</v-icon>
        </v-btn>
        <small v-text="paginationRangeText"/>
        <v-btn
          icon
          class="mx-1 my-0"
          :disabled="pagination.page === lastPage"
          @click="setPage(pagination.page + 1)"
        >
          <v-icon>navigate_next</v-icon>
        </v-btn>
        <v-btn
          icon
          class="mx-1 my-0"
          :disabled="pagination.page === lastPage"
          @click="setPage(lastPage)"
        >
          <v-icon>last_page</v-icon>
        </v-btn>
      </template>

      <v-spacer/>
      <v-checkbox
        color="primary"
        :label="tr.FilterVisibleLabel"
        :input-value="visibleAreaFilter"
        @change="$store.commit('attributeTable/visibleAreaFilter', $event)"
        class="my-0"
        hide-details
      />
      <v-btn
        flat
        class="my-0"
        @click="fetchFeatures()"
      >
        <translate>Refresh</translate>
      </v-btn>
    </v-layout>
    <features-viewer :features="features"/>
    <portal to="right-panel">
      <info-panel
        v-if="showInfoPanel"
        class="ml-1 mb-2 elevation-3"
        :data="[{features, layer}]"
        :selected="infoPanelSelection"
        @selection-change="selectedFeatureIndex = $event.featureIndex"
        @close="showInfoPanel = false"
      />
    </portal>
  </v-layout>
</template>

<script>
import { mapState, mapGetters, mapMutations } from 'vuex'
import Polygon from 'ol/geom/polygon'
import GeoJSON from 'ol/format/geojson'
import TabsHeader from './TabsHeader'
import AttributeFilter from './AttributeFilter'
import FeaturesViewer from './ol/FeaturesViewer'
import InfoPanel from './InfoPanel'
import { createStyle } from '@/map/styles'
import { getFeaturesQuery } from '@/map/featureinfo.js'

function iconHeader (key) {
  return {
    text: key,
    value: key,
    sortable: false,
    width: 1,
    blank: true,
    class: 'icon'
  }
}

const SelectedStyle = createStyle([3, 169, 244])

export default {
  name: 'attribute-table',
  components: { TabsHeader, AttributeFilter, FeaturesViewer, InfoPanel },
  data () {
    return {
      loading: false,
      pagination: null,
      selectedFeatureIndex: null,
      showInfoPanel: false
    }
  },
  computed: {
    ...mapState(['project']),
    ...mapState('attributeTable', ['page', 'limit', 'visibleAreaFilter', 'layer', 'features']),
    ...mapGetters('attributeTable', ['layerFilters']),
    headers () {
      if (this.layer.attributes) {
        const columns = this.layer.attributes.map(attr => ({
          text: attr.alias || attr.name,
          type: attr.type.toLowerCase(),
          value: attr.name,
          align: 'left',
          sortable: false
        }))
        return [iconHeader('_z'), iconHeader('_i')].concat(columns)
      }
      return []
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
        FilterVisibleLabel: this.$gettext('Filter to visible area')
      }
    },
    selectedFeature () {
      return this.features[this.selectedFeatureIndex]
    },
    infoPanelSelection () {
      return this.selectedFeature && {
        layer: this.layer.name,
        featureIndex: this.selectedFeatureIndex
      }
    }
  },
  watch: {
    layer: {
      immediate: true,
      handler (layer, old) {
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
    }
  },
  methods: {
    ...mapMutations('attributeTable', ['clearFilter', 'updateFilterComparator', 'updateFilterValue', 'updateFilterValidity']),
    async fetchFeatures (page = 1, lastQuery = false) {
      const filters = Object.entries(this.layerFilters)
        // .filter(([name, filter]) => filter.comparator && filter.value !== null)
        .filter(([name, filter]) => filter.comparator && filter.valid)
        .map(([name, filter]) => ({
          attribute: name,
          operator: filter.comparator,
          value: filter.value
        }))

      let query
      if (lastQuery) {
        query = this.pagination.query
      } else {
        let geom = null
        if (this.visibleAreaFilter) {
          geom = Polygon.fromExtent(this.$map.ext.visibleAreaExtent())
        }
        query = getFeaturesQuery([this.layer.name], geom, filters)
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
      const featureProjection = this.$map.getView().getProjection().getCode()
      const features = Object.freeze(parser.readFeatures(geojson, { featureProjection }))

      this.$store.commit('attributeTable/features', features)
      if (this.selectedFeature) {
        this.selectedFeatureIndex = 0
      }
      this.pagination = {
        query,
        page,
        rowsPerPage: this.limit,
        totalItems: featuresCount
      }
      /*
      const wfsParams = {
        layer: this.layer.name.replace(/ /g, '_'),
        maxfeatures: this.limit,
        filters,
        startindex: 0
      }
      if (this.visibleAreaFilter) {
        const size = this.$map.getSize()
        wfsParams['bbox'] = this.$map.getView().calculateExtent(size)
      }
      this.$http.post(`/filter/?PROJECT=${this.project.config.project}`, wfsParams)
        .then(resp => {
          this.loading = false
        })
        .catch(resp => {
          this.loading = false
        })
      */
    },
    setPage (page) {
      this.fetchFeatures(page, true)
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
      th.icon {
        padding: 8px;
      }
    }
    .v-datatable__progress {
      background-color: #fff;
      height: 3px!important;
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
          color: #777;
        }
      }
    }
  }
}
.bottom-panel {
  height: 2.25em;
  background-color: #fff;
  border-top: 1px solid #ccc;
  pointer-events: auto;
  .v-input--checkbox {
    flex: 0 0 auto;
    /deep/ .v-label {
      font-size: 85%!important;
    }
  }
  .v-text-field {
    font-size: 14px;
    margin-top: 0;
  }
  label {
    font-size: 13px;
    color: #555;
  }
}
.info-panel {
  flex: 0 1 auto;
}
</style>
