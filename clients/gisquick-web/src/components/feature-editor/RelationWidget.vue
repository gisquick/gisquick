<template>
  <v-text-field
    class="filled"
    :label="label"
    :value="value"
    readonly
    @click="showDialog"
  >
    <template v-slot:append>
      <v-icon name="attribute-table"/>
      <portal to="map-overlay">
        <transition name="fade">
          <div v-show="minimized" class="floating-bar">
            <v-btn
              :id="minimizedTargetId"
              color="dark"
              class="icon p-1"
              @click="minimized = false"
            >
              <v-icon name="maximize"/>
            </v-btn>
          </div>
        </transition>
      </portal>
      <v-dialog
        content-class="m-0"
        v-model="open"
        :title="relation.name"
        :modal="false"
        persistent
      >
        <template v-slot="{ close }">
          <minimize-transition :target="`#${minimizedTargetId}`">
            <!-- <template v-slot:trigger>
              <transition name="fade">
                <div v-show="minimized" class="floating-bar">
                  <v-btn
                    color="dark"
                    class="icon p-1"
                    @click="minimized = false"
                  >
                    <v-icon name="maximize"/>
                  </v-btn>
                </div>
              </transition>
            </template> -->
            <resize-container v-show="!minimized" depth="2" class="relation-dialog f-col">
              <div class="header dark" @mousedown.stop="onDragStart">
                <span v-text="relationData.relation.name"/>
                <div class="f-row-ac">
                  <v-btn class="icon" @click.prevent="minimized = true">
                    <v-icon name="minimize"/>
                  </v-btn>
                  <v-btn class="icon" @click="close">
                    <v-icon name="x"/>
                  </v-btn>
                </div>
              </div>
              <div class="dialog-content f-col">
                <attributes-table
                  ref="attrTable"
                  class="m-2"
                  :project="project"
                  :layer="relationData.relation.referencing_layer"
                  :features.sync="relationData.features"
                  :selected-id.sync="relationData.selected"
                  :filters.sync="relationData.filters"
                  :sort-by.sync="relationData.sortBy"
                  :pagination.sync="relationData.pagination"
                  :limit.sync="attrTableSettings.limit"
                  :visible-area-filter.sync="attrTableSettings.visibleAreaFilter"
                  :color="[31,203,124]"
                  :highlight-color="[255,157,59]"
                />
                <div class="toolbar f-row-ac f-justify-end m-1">
                  <v-btn class="small outlined" @click="close">
                    <translate>Close</translate>
                  </v-btn>
                  <v-btn
                    class="small"
                    color="dark"
                    @click="[selectRelationObject(), close()]"
                  >
                    <translate>Select</translate>
                  </v-btn>
                </div>
              </div>
            </resize-container>
          </minimize-transition>
        </template>
      </v-dialog>
    </template>
  </v-text-field>
</template>

<script>
import AttributesTable from '@/components/attributes-table/TableView.vue'
import ResizeContainer from '@/ui/ResizeContainer.vue'
import MinimizeTransition from '@/components/transitions/MinimizeTransition.vue'
import Draggable from '@/ui/utils/draggable'
import TextField from './TextField.vue'

export default {
  components: { TextField, AttributesTable, ResizeContainer, MinimizeTransition, Draggable },
  props: {
    project: Object,
    layer: Object,
    relation: Object,
    label: String,
    value: {}
  },
  data () {
    return {
      attrTableSettings: {
        limit: 10,
        visibleAreaFilter: false
      },
      relationData: null,
      minimized: false,
      open: false
    }
  },
  computed: {
    minimizedTargetId () {
      return `minimize-btn-${this._uid}`
    }
  },
  methods: {
    showDialog () {
      if (!this.relationData) {
        const filters = this.layer.attributes.reduce((res, attr) => {
          res[attr.name] = {
            active: false,
            comparator: null,
            value: null,
            valid: false
          }
          return res
        }, {})
        this.relationData = {
          relation: this.relation,
          features: [],
          selected: null,
          pagination: null,
          filters,
          sortBy: {
            property: this.layer.attr_table_fields?.[0] ?? this.layer.attributes[0].name,
            order: 'asc'
          }
        }
      }
      if (this.minimized) {
        this.minimized = false
      } else {
        this.open = true
      }
    },
    selectRelationObject () {
      const { relation, features, selected } = this.relationData
      const feature = features.find(f => f.getId() === selected)
      this.$emit('change', relation, feature)
    },
    onDragStart (e) {
      const draggable = Draggable(e.currentTarget.parentElement.parentElement.parentElement)
      draggable.onDragStart(e)
    }
  }
}
</script>

<style lang="scss" scoped>
.relation-dialog {
  background-color: #fff;
  position: relative;
  user-select: none;
  max-height: 90vh;
  width: clamp(50vw, 80vw, 1400px);
  @media (max-width: 600px) {
    width: 100vw;
    max-height: calc(var(--vh, 1vh)* 100);
  }
  .header {
    background-color: #333;
    user-select: none;
  }
  .dialog-content {
    overflow: auto;
  }
  .attribute-table {
    min-height: 150px;
    flex-shrink: 1;
    border: 1px solid #ccc;
    border-width: 0 1px 1px 1px;
  }
}
.floating-bar {
  position: fixed;
  left: 50%;
  transform: translate(-50%, 0);
  top: 2px;
  pointer-events: auto;
  @media (max-width: 600px) {
    left: auto;
    right: 2px;
    transform: none;
  }
}
</style>
