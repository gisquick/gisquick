<template>
  <v-layout column>
    <!-- Header -->
    <tabs-header @close="close">
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
      <v-layout
        class="column filter"
        slot="headerCell"
        slot-scope="{ header }"
      >
        <span v-text="header.text"/>
        <v-layout row v-if="header.text">
          <v-select
            placeholder="Operator"
            :items="Operators[header.type]"
            v-model="filters[header.value].comparator"
            class="my-1 mr-1"
            hide-details
          />
          <v-text-field
            class="my-1 mr-1"
            v-model="filters[header.value].value"
            hide-details
          />
          <v-btn
            icon
            class="mx-0 my-0"
            @click="clearFilter(header.value)"
          >
            <icon name="delete"/>
          </v-btn>
        </v-layout>
      </v-layout>

      <template slot="items" slot-scope="{ item, index }">
        <tr @click="">
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
    <v-layout class="row align-center bottom-panel">
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
        v-model="visibleAreaFilter"
        label="Filter to visible area"
        class="my-0"
        hide-details
      />
      <v-btn flat @click="fetchFeatures">Refresh</v-btn>
    </v-layout>
  </v-layout>
</template>

<script>
import { mapState } from 'vuex'
import TabsHeader from './TabsHeader'

const zoomToHeader = {
  text: '',
  value: '',
  sortable: false,
  width: 1
}

const Operators = {
  text: [
    {
      text: '=',
      value: '='
    },
    {
      text: '!=',
      value: '!='
    },
    {
      text: 'LIKE',
      value: 'LIKE'
    },
    {
      text: 'IN',
      value: 'IN'
    }
  ],
  integer: [
    {
      text: '=',
      value: '='
    },
    {
      text: '!=',
      value: '!='
    },
    {
      text: '<',
      value: '<'
    },
    {
      text: '<=',
      value: '<='
    },
    {
      text: '>',
      value: '>'
    },
    {
      text: '>=',
      value: '>='
    },
    {
      text: 'IN',
      value: 'IN'
    },
    {
      text: 'BETWEEN',
      value: 'BETWEEN'
    }
  ]
}
export default {
  components: { TabsHeader },
  props: {
    layer: Object
  },
  data () {
    return {
      limit: 50,
      visibleAreaFilter: false,
      filters: {},
      loading: false,
      features: [],
      pagination: null
    }
  },
  computed: {
    ...mapState(['project']),
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
      return Math.ceil(totalItems / rowsPerPage)
    },
    paginationRangeText () {
      const { page, rowsPerPage, totalItems } = this.pagination
      const sIndex = (page - 1) * rowsPerPage + 1
      const eIndex = Math.min(sIndex + rowsPerPage - 1, totalItems)
      return `${sIndex} - ${eIndex} of ${totalItems}`
    },
    Operators () {
      return Operators
    }
  },
  watch: {
    layer: {
      immediate: true,
      handler (layer) {
        const filters = {}
        this.layer.attributes.forEach(attr => {
          filters[attr.name] = {
            comparator: null,
            value: null
          }
        })
        this.filters = filters
        this.fetchFeatures()
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
    fetchFeatures () {
      this.loading = true
      // convert to WFS layer name
      const layerName = this.layer.name.replace(/ /g, '_')

      const filters = Object.entries(this.filters)
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
          this.features = resp.data.features
          this.loading = false
        })
        .catch(resp => {
          this.loading = false
        })
    },
    zoomToFeature (feature) {

    },
    clearFilter (attrName) {
      this.filters[attrName].value = null
      this.filters[attrName].comparator = null
    },
    close () {
      this.$root.$panel.setBottomPanel(null)
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
    .filter {
      .v-select {
        width: auto;
        flex: 0 0 auto;
        .v-select__selections {
          max-width: 52px; // to make width compact
          font-size: 80%;
        }
      }
      .icon {
        width: 1.15em;
        height: 1.15em;
        opacity: 0.7;
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
