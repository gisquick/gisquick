<template>
  <div
    class="attribute-table light f-col"
  >
    <!-- Table -->
    <v-table
      class="f-grow"
      :columns="columns"
      item-key="_id"
      :items="tableData"
      :error="loadingError"
      :loading="loading"
      :selected="selectedId"
      :sort="{ sortBy: sortBy.property, sort: sortBy.order }"
      sortable
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
          v-if="filters[column.key]"
          class="f-row-ac"
          :attribute="column.attr"
          :label="column.label"
          :filter="filters[column.key]"
          :sort="sortBy.property === column.key ? sortBy.order : ''"
          @change="onFilterChange(column.key, $event)"
          @clear="clearFilter(column.key)"
          @click:label="toggleSort(column.key)"
        />
      </template>
      <template v-slot:cell(actions)="{ row, item }">
        <div class="f-row-ac">
          <v-btn
            class="icon flat m-0"
            :disabled="!item.geometry"
            @click="zoomToFeature(features[row])"
          >
            <v-icon name="zoom-to"/>
            <v-tooltip v-if="!item.geometry" slot="tooltip">
              <translate>No geometry</translate>
            </v-tooltip>
          </v-btn>
          <slot name="actions" :row="row" :item="item"/>
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
        <slot name="toolbar"/>
      </template>
      <div class="f-grow"/>
      <v-checkbox
        color="primary"
        :label="tr.FilterVisibleLabel"
        :value="visibleAreaFilter"
        @input="updateVisibleAreaFilter"
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
    <features-viewer
      :features="features"
      :color="color"
      :selectedColor="highlightColor"
      :selected="selectedFeature"
    />
  </div>
</template>

<script>
import AttributeFilter from './AttributeFilter.vue'
import FeaturesViewer from '@/components/ol/FeaturesViewer.vue'

import FetchMixin from './fetch.js'
import TableMixin from './table.js'

export default {
  name: 'attribute-table',
  mixins: [FetchMixin, TableMixin],
  components: { AttributeFilter, FeaturesViewer },
  props: {
    project: Object,
    layer: Object,
    filters: Object,
    features: Array,
    limit: Number,
    visibleAreaFilter: Boolean,
    sortBy: Object,
    pagination: Object,
    selectedId: String,
    fetchRelations: Boolean,
    color: Array,
    highlightColor: {
      type: Array,
      default: () => [3, 169, 244]
    }
  },
  computed: {
    selectedFeature () {
      return this.features.find(f => f.getId() === this.selectedId)
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
      const eIndex = sIndex + this.features.length - 1
      return `${sIndex} - ${eIndex} / ${totalItems}`
    },
    tr () {
      return {
        FilterVisibleLabel: this.$gettext('Filter to visible area'),
        PageSize: this.$gettext('Page size')
      }
    }
  },
  methods: {
    _setFeatures (data) {
      this.$emit('update:features', data.features)
      this.$emit('update:pagination', data.pagination)
      if (!this.selectedId || !data.features.some(f => f.getId() === this.selectedId)) {
        this.$emit('update:selectedId', data.features[0]?.getId() ?? -1)
      }
    },
    clearAllFilters () {
      const filters = { ...this.filters }
      Object.entries(filters).forEach(([name, filter]) => {
        if (filter.comparator !== null || filter.value !== null) {
          filters[name] = {
            active: false,
            comparator: null,
            value: null,
            valid: false
          }
        }
      })
      this.$emit('update:filters', filters)
    },
    setPage (page) {
      this.fetchFeatures(page, true)
    },
    zoomToFeature (feature) {
      this.$map.ext.zoomToFeature(feature)
    },
    onFilterChange (attr, filter) {
      this.$emit('update:filters', { ...this.filters, [attr]: filter })
    },
    selectFeature (item) {
      this.$emit('update:selectedId', item._id)
    },
    updateLimit (value) {
      this.$emit('update:limit', value)
    },
    updateVisibleAreaFilter (enabled) {
      this.$emit('update:visibleAreaFilter', enabled)
    },
    toggleSort (column) {
      let { property, order } = this.sortBy
      if (property === column) {
        order = order === 'asc' ? 'desc' : 'asc'
      } else {
        property = column
      }
      this.$emit('update:sortBy', { property, order })
    }
  }
}
</script>

<style lang="scss" scoped>
.attribute-table {
  font-size: 14px;
  --icon-color: #555;
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
    thead {
      th[role="columnheader"] {
        height: 40px;
        padding-block: 5px;
      }
      tr.progress th {
        top: 40px!important;
      }
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
.bottom-panel {
  height: 36px;
  flex-shrink: 0;
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
  white-space: nowrap;
  overflow-x: auto;
  --gutter: 2px 6px;
  // flex-wrap: wrap;

  .btn {
    flex-shrink: 0;
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
.scroll-container {
  ::v-deep {
    .scrollbar-track.vertical {
      margin-top: 40px;
    }
  }
}
</style>
