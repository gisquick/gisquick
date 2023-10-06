<template>
  <div class="list-table">
    <transition name="fade">
      <div v-if="loading" class="loader">
        <div class="bg f-row-ac m-2 shadow-2">
          <v-spinner width="3" size="20"/>
        </div>
      </div>
    </transition>
    <template v-if="!error && renderItems">
      <template v-for="(item, row) in renderItems">
        <div
          :key="row"
          class="row"
          :class="{even: row % 2, selected: selectedLookup[item[itemKey]]}"
          @click="$emit('item-click', item, row)"
        >
          <!-- <slot name="item-append" :item="item" :selected="selectedLookup[item[itemKey]]"/> -->
          <template v-for="(col, index) in columns">
            <slot :name="`field(${col.key})`" :item="item" v-bind="values[row][col.key]">
              <div
                :key="col.key"
                :class="columnsClasses[index]"
                class="column"
              >
                <span class="label" v-text="col.label"/>
                <slot :name="`cell(${col.key})`" v-bind="values[row][col.key]">
                  <span v-text="values[row][col.key].value"/>
                </slot>
              </div>
            </slot>
          </template>
        </div>
      </template>
    </template>
    <div v-if="error" class="error f-row-ac m-4">
      <v-icon name="warning" class="mr-2"/>
      <span v-text="errorText"/>
    </div>
  </div>
</template>

<script lang="js">
import difference from 'lodash/difference'
const formats = {}

function lookupTable (items) {
  return items.reduce((obj, val) => (obj[val] = true, obj), {})
}

export default {
  props: {
    /**
     * - key: String
     * - label: String, Array
     * - format: String (data format)
     * - transform: Function (transformation before formatting)
     * - sortable: Boolean
     * - info: String
     * - align: String (left,center,right)
     * - columnClass: String, Object, Array
     * - mapValues: Object (values lookup table)
     */
    columns: Array,
    categorizedItems: Array,
    error: [String, Boolean, Object],
    items: Array,
    itemKey: String,
    loading: Boolean,
    selected: {
      default: null
    },
    sort: Object
  },
  data () {
    return {
      closing: {}
    }
  },
  computed: {
    renderItems () {
      if (this.categorizedItems) {
        const items = []
        this.categorizedItems.forEach(cat => {
          items.push({ title: cat.title, $slot: 'subheader' })
          items.push(...cat.items)
        })
        return items
      }
      return this.items
    },
    columnsClasses () {
      return this.columns.map(col => [col.format, col.align, col.columnClass])
    },
    values () {
      return this.renderItems.map(this.itemData)
    },
    selectedLookup () {
      if (Array.isArray(this.selected)) {
        return lookupTable(this.selected)
      }
      return { [this.selected]: true }
    },
    errorText () {
      return !!this.error && (typeof this.error === 'string' ? this.error : this.$gettext('Error'))
    }
  },
  watch: {
    selected (n, o) {
      if (Array.isArray(o)) {
        this.closing = lookupTable(difference(o, n))
      } else {
        this.closing = { [o]: true }
      }
      setTimeout(() => {
        this.closing = {}
      }, 500)
    }
  },
  methods: {
    keyValue (item, key) {
      // todo: consider to use lodash/get
      const props = key.split('.')
      let value = item[props[0]]
      for (const prop of props.slice(1)) {
        if (!value) {
          break
        }
        value = value[prop]
      }
      return value
    },
    itemData (item, row) {
      if (this.categorizedItems && item.$slot === 'subheader') {
        return null
      }
      const data = {}
      this.columns.forEach(col => {
        let value = this.keyValue(item, col.key)
        if (col.transform) {
          value = col.transform(value)
        }
        if (col.format) {
          value = this.formatValue(value, item, col)
        } else if (col.mapValues) {
          value = col.mapValues[value]
        }
        data[col.key] = { row, item, value }
      })
      return data
    },
    formatValue (value, item, col) {
      return formats[col.format](value)
    }
  }
}
</script>

<style lang="scss" scoped>
.list-table {
  font-size: 15px;
  display: flex;
  flex-direction: column;
}
.row {
  border-top: 1px solid #ddd;
  background-color: #f7f7f7;
  // margin-bottom: 1px;
  line-height: 1.35;
  display: flex;
  flex-direction: column;
  &.even {
    background-color: #fff;
    .column {
      border-color: #e9e9e9;
    }
    .label {
      opacity: 0.95;
    }
  }
  &.selected {
    background-color: rgba(25, 118, 210, 0.1);
    .column {
      border-color: #e2e2e2;
    }
    .label {
      opacity: 1;
    }
  }
}
.column {
  display: flex;
  flex-direction: column;
  padding: 6px;
  min-height: 52px;
  border-bottom: 1px solid #eee;
  .label {
    text-transform: uppercase;
    font-size: 11.8px;
    font-weight: 500;
    font-weight: 700;
    opacity: 0.6;
    color: var(--color-primary);
    color: rgb(61, 86, 105);
    // color: #6b4663;
    // color: #6b4663d3;
    // color: #7183a0;
    // color: #7c7070;

    opacity: 0.9;
    margin-bottom: 2px;

    // margin: -6px 0 8px -6px;
    // background-color: rgba(#ccc, 0.3);
    // align-self: start;
    // padding: 0 4px;
  }
  ::v-deep a {
    color: var(--color-primary);
    text-decoration: none;
  }
}
.loader {
  position: sticky;
  top: 0;
  justify-self: flex-start;
  align-self: center;
  z-index: 1;
  height: 0;
  overflow: visible;
  .bg {
    background-color: #fff;
    border-radius: 50%;
    padding: 4px;
  }
}
.error {
  color: var(--color-red);
  --icon-color: currentColor;
  font-weight: 500;
  align-self: center;
}
</style>
