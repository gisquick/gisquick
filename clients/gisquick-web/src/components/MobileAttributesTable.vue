<template>
  <div>
    <portal to="main-panel">
      <div class="attributes-panel light f-col" key="attribute-table">
        <div class="scroll-area f-col">
          <div class="f-row f-align-end">
            <v-select
              class="filled f-grow mr-0"
              :placeholder="mtr.SelectLayer"
              :label="mtr.Layer"
              item-text="title"
              item-value="name"
              :disabled="mode !== 'view'"
              :value="layer && layer.name"
              :items="layersList"
              @input="showAttributesTable"
            />
            <v-menu
              align="rr;bb,tt"
              :items="mainMenu"
            >
              <template v-slot:activator="{ toggle }">
                <v-btn
                  :aria-label="mtr.Menu"
                  class="icon p-2"
                  @click="toggle"
                >
                  <v-icon name="tools"/>
                </v-btn>
              </template>
            </v-menu>
          </div>
          <template v-if="mode === 'add' && layer">
            <translate class="data-label" key="new-feature">New Feature</translate>
            <new-feature-editor
              class="f-grow"
              :layer="layer"
              toolbar-target="mat-toolbar"
              @edit="mNewFeatureAdded"
            />
          </template>
          <template v-if="mode === 'view'">
            <div class="f-row-ac">
              <translate class="label" key="filters">Data Filters</translate>
              <div class="f-grow"/>
              <v-menu
                align="rr;bb,tt"
                :items="filterFieldsMenu"
              >
                <template v-slot:activator="{ toggle }">
                  <v-btn
                    :aria-label="mtr.Menu"
                    :disabled="!layer"
                    class="icon p-1"
                    @click="toggle"
                  >
                    <div class="filter-menu">
                      <v-icon name="filter" size="12"/>
                      <v-icon name="menu-dots"/>
                    </div>
                  </v-btn>
                </template>
              </v-menu>
            </div>
            <!-- <translate v-if="!mFilterFields.length" class="note">Attribute filters not defined</translate> -->
            <template v-for="column in mFilterFields">
              <attribute-filter
                :key="column.key"
                class="field-filter"
                mobile
                :attribute="column.attr"
                :label="column.label"
                :type="column.type"
                :filter="layerFilters[column.key]"
                @change="onFilterChange(column.key, $event)"
                @clear="clearFilter(column.key)"
              />
            </template>
            <div class="f-row-ac">
              <v-checkbox
                class="mt-4"
                color="primary"
                :label="tr.FilterVisibleLabel"
                :value="visibleAreaFilter"
                @input="updateVisibleAreaFilter"
              />
              <v-btn
                class="icon ml-auto round"
                color="primary"
                @click="fetchFeatures()"
              >
                <v-icon name="reload"/>
              </v-btn>
            </div>
            <translate class="data-label" key="data">Data</translate>
            <list-table
              v-if="layer && tableData"
              class="f-grow"
              :columns="columns"
              item-key="_id"
              :items="tableData"
              :error="loadingError"
              :loading="loading"
              :selected="selectedFeatureId"
              @item-click="selectFeature"
            >
              <template v-slot:field(actions)="{ item, row }">
                <v-menu
                  v-if="selectedFeatureId === item._id"
                  class="item-menu float-box"
                  align="rr;bb,tt"
                  :items="featureMenu"
                >
                  <template v-slot:activator="{ toggle }">
                    <v-btn
                      :aria-label="mtr.Menu"
                      class="icon round shadow-2"
                      @click="toggle"
                    >
                      <v-icon name="menu-dots"/>
                    </v-btn>
                  </template>
                </v-menu>
                <div v-else class="float-box">
                  <div class="feature-num f-row-ac" v-text="row + 1"/>
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
            </list-table>
            <translate v-else key="nodata" class="note f-grow p-4 text-center">
              No Data
            </translate>
          </template>
          <template v-if="mode === 'edit'">
            <translate class="data-label" key="edit">Edit feature</translate>
            <feature-editor
              class="edit-form f-grow"
              toolbar-target="mat-toolbar"
              :feature="selectedFeature"
              :layer="layer"
              :project="$store.state.project.config"
              @edit="onFeatureEdit"
              @delete="onFeatureEdit"
            />
          </template>
        </div>
        <!-- end of scroll area  -->
        <!-- <transition name="fade">
          <div v-if="true || loading" class="status f-row-ac m-2 p-2 shadow-2">
            <v-spinner width="3" size="20"/>
          </div>
        </transition> -->

        <div v-if="mode === 'edit' || mode === 'add'" class="bottom-bar f-row-ac">
          <portal-target name="mat-toolbar" class="f-grow"/>
          <v-btn @click="mode = 'view'">
            <translate>Cancel</translate>
          </v-btn>
        </div>

        <div v-if="mode === 'view' && layer && pagination" class="bottom-bar f-row-ac px-1">
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
          <span v-text="paginationRangeText" class="mx-1 f-grow text-center"/>
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
        </div>
      </div>
    </portal>
    <features-viewer :features="features"/>
    <portal to="right-panel">
      <info-panel
        v-if="showInfoPanel"
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

<script lang="js">
import pickBy from 'lodash/pickBy'
import { mapState } from 'vuex'
import AttributesTable from './AttributesTable.vue'
import ListTable from '@/ui/ListTable.vue'
import FeatureEditor from '@/components/feature-editor/FeatureEditor.vue'

export default {
  name: 'mobile-attribute-table',
  extends: AttributesTable,
  components: { ListTable, FeatureEditor },
  data () {
    return {
      layersFilterSelections: {},
      mode: 'view'
    }
  },
  computed: {
    ...mapState('attributeTable', ['filters']),
    mtr () {
      return {
        Layer: this.$gettext('Layer'),
        SelectLayer: this.$gettext('Select layer'),
        Menu: this.$gettext('Menu')
      }
    },
    layerEditable () {
      const { permissions = {} } = this.layer
      return permissions.update || permissions.delete
    },
    layersList () {
      // return this.project.overlays.list.filter(l => l.queryable && l.visible && !l.hidden)
      return this.project.overlays.list.filter(l => l.queryable).map(l => ({
        title: l.title,
        name: l.name,
        disabled: !l.visible || l.hidden
      }))
    },
    selectedFilterFields: {
      get () {
        return this.layersFilterSelections[this.layer.name]
      },
      set (newValue) {
        this.layersFilterSelections[this.layer.name] = newValue
      }
    },
    mFilterFields () {
      if (!this.layer) {
        return []
      }
      return this.columns.filter(c => this.selectedFilterFields.includes(c.key))
      // return this.columns.filter(c => this.layerFilters[c.key]?.active)
      // return Object.values(this.layerFilters).filter(f => f.active).map(f => )
    },
    mainMenu () {
      const sizes = [1, 5, 10, 20]
      return [
        {
          text: this.$gettext('Add new feature'),
          disabled: !this.layer || !this.layer.permissions?.insert,
          icon: 'attribute-table-add',
          action: () => {
            this.mode = 'add'
          }
        }, {
          text: this.$gettext('Export'),
          icon: 'download',
          disabled: !this.attributesToExport.length,
          action: this.exportFeatures
        }, {
          text: this.$gettext('Page size'),
          separator: true
        },
        ...sizes.map(s => ({
          text: s,
          checked: this.limit === s,
          action: () => {
            this.updateLimit(s)
          }
        }))
      ]
    },
    filterFieldsMenu () {
      if (!this.layer) {
        return []
      }
      const fields = this.attributes.map(attr => ({
        text: attr.alias || attr.name,
        checked: this.selectedFilterFields.includes(attr.name),
        action: () => {
          const f = this.layerFilters[attr.name]
          // console.log('filterFieldsMenu', f, attr.name, f.active)
          if (this.selectedFilterFields.includes(attr.name)) {
            this.selectedFilterFields = this.selectedFilterFields.filter(n => n !== attr.name)
            this.onFilterChange(attr.name, { ...f, active: false })
          } else {
            this.selectedFilterFields.push(attr.name)
            this.onFilterChange(attr.name, { ...f, active: true })
          }
        }
      }))
      return [
        {
          text: this.$gettext('Clear attributes filters'),
          icon: 'reset_filter',
          action: () => {
            this.selectedFilterFields = []
            this.clearAllFilters()
          }
        }, {
          text: this.$gettext('Attributes'),
          separator: true
        },
        ...fields
      ]
    },
    featureMenu () {
      return [
        {
          text: this.$gettext('Zoom to'),
          icon: 'zoom-to',
          action: () => {
            this.zoomToFeature(this.selectedFeature)
          }
        }, {
          text: this.$gettext('Info Panel'),
          icon: 'circle-i-outline',
          action: () => {
            this.showInfoPanel = true
          }
        }, {
          text: this.$gettext('Edit'),
          icon: 'edit',
          disabled: !this.layerEditable,
          action: () => {
            this.mode = 'edit'
          }
        }
      ]
    }
  },
  created () {
    const data = {}
    const layers = this.project.overlays.list.filter(l => l.queryable)
    layers.forEach(l => {
      data[l.name] = Object.keys(pickBy(this.filters[l.name], f => f.active || f.valid))
    })
    this.layersFilterSelections = data
  },
  methods: {
    showAttributesTable (layername) {
      const layer = this.project.overlays.list.find(l => l.name === layername)
      this.$store.commit('attributeTable/layer', layer)
    },
    mNewFeatureAdded (f) {
      this.newFeatureAdded(f)
      this.mode = 'view'
    }
  }
}
</script>

<style lang="scss" scoped>
.attributes-panel {
  display: grid;
  grid-template-rows: 1fr auto;
  // height: calc(100vh - 44px);
  height: calc(var(--vh, 1vh) * 100 - 44px);
  // max-height: calc(var(--vh, 1vh) * 100 - 44px);
  overflow: hidden;
  font-size: 15px;
  .scroll-area {
    overflow: auto;
    min-height: 0;
    grid-area: 1 / 1 / 2 / 2;
    z-index: 1;
  }
  // .status {
  //   grid-area: 1 / 1 / 2 / 2;
  //   align-self: start;
  //   justify-self: center;
  //   z-index: 2;
  //   border-radius: 50%;
  //   background-color: #fff;
  // }
  .label {
    font-size: 11.5px;
    text-transform: uppercase;
    font-weight: 500;
    opacity: 0.75;
    margin: 0 6px;
  }
}
.list-table {
  flex-shrink: 0;
  min-height: 0;
  position: relative;

  ::v-deep .row {
    position: relative;
  }
  .float-box {
    position: sticky;
    top: 0;
    height: 0;
    align-self: flex-end;
    display: flex;
    z-index: 1;
    overflow: visible;
  }
  .item-menu {
    .btn {
      opacity: 0.8;
      background-color: #fff;
    }
  }
  .feature-num {
    min-width: 16px;
    height: 16px;
    line-height: 16px;
    justify-content: center;
    background-color: #111;
    color: #fff;
    z-index: 1;
    font-weight: 700;
    font-size: 11px;
    border-radius: 10px;
    margin: 4px;
    padding: 2px;
    opacity: 0.2;
  }
}
.btn.round {
  width: 28px;
  height: 28px;
}
.filter-menu {
  display: grid;
  width: 22px;
  .icon {
    grid-area: 1 / 1 / 2 / 2;
  }
  :first-child {
    align-self: start;
    justify-self: start;
  }
  :nth-child(2) {
    align-self: start;
    justify-self: end;
    margin-right: -4px;
  }
}
.bottom-bar {
  height: 36px;
  // background-color: #fff;
  background-color: #f3f3f3;
  // background-color: #fafafa;
  pointer-events: auto;
  font-size: 13px;

  border-top: 1px solid #ccc;
  border-bottom: 1px solid #ccc;
  // background-color: #e7e7e7;
  .btn {
    max-height: 28px;
    &.icon {
      width: 32px;
      height: 28px;
      margin: 2px;
    }
  }
}
.field-filter {
  display: grid;
  grid-template-columns: 1fr auto;
  grid-template-rows: auto auto;
  align-items: center;
  gap: 0;
  margin: 0 2px 6px 6px;
  ::v-deep .label {
    grid-column: 1 / -1;
    font-size: 11.8px;
    font-weight: 500;
    color: var(--color-primary);
  }
  ::v-deep .btn {
    width: 28px;
  }
}
.note {
  padding: 0 6px;
  font-size: 14px;
  opacity: 0.5;
}
.data-label {
  font-size: 9.5px;
  font-weight: bold;
  letter-spacing: 1px;
  text-transform: uppercase;
  text-align: center;
  background-color: #444;
  color: #fff;
}
</style>
