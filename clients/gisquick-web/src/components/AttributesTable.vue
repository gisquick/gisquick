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
      :pagination.sync="pagination"
      hide-actions
    >
      <template slot="headerCell" slot-scope="{ header }">
        <attribute-filter
          :label="header.text"
          :type="header.type"
          :filter="layerFilters[header.value]"
          @input:comparator="updateFilterComparator({ attr: header.value, comparator: $event })"
          @input:value="updateFilterValue({ attr: header.value, value: $event })"
          @clear="clearFilter(header.value)"
        />
      </template>
      <template slot="items" slot-scope="{ item }">
        <tr :class="{selected: zoomedFeatureId === item.id}">
          <td
            class="icon px-3"
            @click="zoomToFeature(item)"
          >
            <icon name="zoom-to"/>
          </td>
          <td v-for="attr in layer.attributes" :key="attr.name">
            {{ item.properties[attr.name] }}
          </td>
        </tr>
      </template>
    </v-data-table>
    <v-layout class="row align-center bottom-panel" xv-if="false">
      <v-btn
        icon
        class="mx-1 my-0"
        :disabled="pagination.page === 1"
        @click="pagination.page = 1"
      >
        <v-icon>first_page</v-icon>
      </v-btn>
      <v-btn
        icon
        class="mx-1 my-0"
        :disabled="pagination.page === 1"
        @click="pagination.page--"
      >
        <v-icon>navigate_before</v-icon>
      </v-btn>
      <small v-text="paginationRangeText"/>
      <v-btn
        icon
        class="mx-1 my-0"
        :disabled="pagination.page === lastPage"
        @click="pagination.page++"
      >
        <v-icon>navigate_next</v-icon>
      </v-btn>
      <v-btn
        icon
        class="mx-1 my-0"
        :disabled="pagination.page === lastPage"
        @click="pagination.page = lastPage"
      >
        <v-icon>last_page</v-icon>
      </v-btn>

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
        @click="fetchFeatures"
      >
        <translate>Refresh</translate>
      </v-btn>
    </v-layout>
    <features-viewer :features="geometryFeatures" :color="[3, 169, 244]"/>
  </v-layout>
</template>

<script>
import { mapState, mapGetters, mapMutations } from 'vuex'
import GeoJSON from 'ol/format/geojson'
import TabsHeader from './TabsHeader'
import AttributeFilter from './AttributeFilter'
import FeaturesViewer from './ol/FeaturesViewer'

const zoomToHeader = {
  text: '',
  value: '',
  sortable: false,
  width: 1
}

export default {
  name: 'attribute-table',
  components: { TabsHeader, AttributeFilter, FeaturesViewer },
  data () {
    return {
      loading: false,
      pagination: null,
      geometryFeatures: [],
      zoomedFeatureId: null
    }
  },
  computed: {
    ...mapState(['project']),
    ...mapState('attributeTable', ['limit', 'visibleAreaFilter', 'layer', 'features']),
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
        return [zoomToHeader].concat(columns)
      }
      return []
    },
    lastPage () {
      const { rowsPerPage, totalItems } = this.pagination
      return Math.floor(totalItems / rowsPerPage) + 1
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
    features: {
      immediate: true,
      handler (features) {
        this.pagination = {
          page: 1,
          rowsPerPage: 5,
          totalItems: features.length
        }
      }
    }
  },
  methods: {
    ...mapMutations('attributeTable', ['clearFilter', 'updateFilterComparator', 'updateFilterValue']),
    fetchFeatures () {
      this.loading = true
      // convert to WFS layer name
      const layerName = this.layer.name.replace(/ /g, '_')

      const filters = Object.entries(this.layerFilters)
        .filter(([name, filter]) => filter.comparator && filter.value)
        .map(([name, filter]) => ({
          attribute: name,
          operator: filter.comparator,
          value: filter.value
        }))

      const wfsParams = {
        layer: layerName,
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
          this.$store.commit('attributeTable/features', resp.data.features)
        })
        .catch(resp => {
          this.loading = false
        })
    },
    zoomToFeature (feature) {
      const params = {
        VERSION: '1.0.0',
        SERVICE: 'WFS',
        REQUEST: 'GetFeature',
        OUTPUTFORMAT: 'GeoJSON',
        FEATUREID: feature.id
      }
      this.loading = true
      this.$http.get(this.project.config.ows_url, { params })
        .then(resp => {
          this.loading = false
          const parser = new GeoJSON()
          const geomFeature = parser.readFeatures(resp.data)[0]
          this.geometryFeatures = Object.freeze([geomFeature])
          this.$map.ext.zoomToFeature(geomFeature)
          this.zoomedFeatureId = feature.id
        })
        .catch(err => {
          this.loading = false
          // TODO: error notification
        })
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
}
</style>
