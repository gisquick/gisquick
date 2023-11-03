<template>
  <div class="attr-filter" :class="classes">
    <span class="label" v-text="attribute.alias || attribute.name"/>
    <div
      v-if="filters"
      class="filter"
    >
      <v-select
        class="filled operator"
        :placeholder="tr.Filter"
        :items="filters"
        :value="filter.comparator"
        @input="operatorChanged"
      >
        <template v-slot:selection="{ text }">
          <span class="value" v-bind="symbolAttrs[text]" v-text="text"/>
        </template>
        <template v-slot:item="{ item }">
          <div class="symbol mx-2" v-bind="symbolAttrs[item.text]" v-text="item.text"/>
          <span
            v-if="tr.filters[item.value]"
            class="mx-2"
            v-text="tr.filters[item.value]"
          />
        </template>
      </v-select>
      <component
        v-if="selectedFilter && selectedFilter.widget"
        :is="selectedFilter.widget"
        class="filled f-grow"
        v-bind="selectedFilter.params"
        :color="isValid ? 'primary' : 'red'"
        :placeholder="placeholder"
        :value="filter.value"
        @input="onValueChane"
      />
    </div>
    <v-btn
      v-if="filters"
      class="icon flat ml-auto mr-0"
      :color="statusColor"
      @click="toggleFilter"
    >
      <v-tooltip slot="tooltip">
        <translate>Filter by attribute value</translate>
      </v-tooltip>
      <v-icon name="filter" size="13"/>
    </v-btn>
  </div>
</template>

<script lang="js">
import DateRange from '@/components/DateRange.vue'
import { valueMapItems } from '@/adapters/attributes'

const Operators = {
  'DATE_EQUAL': '=',
  'DATE_BETWEEN': '⟨ ⟩',
  'SINCE': '≥',
  'UNTIL': '≤',
  '!=': '≠',
  'IS NULL': '≃', // '∅'
  'IS NOT NULL': '≄',
  'IN': '∈',  // '{ }','｛｝'
  'NOT IN': '∉',
  'BETWEEN': '⟨ ⟩', // '〈 〉', '⧼⧽'
  'LIKE': '~',
}

const SymbolAttrs = {
  '∈': { class: 'small' },
  '∉': { class: 'small' },
  '⟨ ⟩': { class: 'small' }
}

const Validators = {
  Integer: text => text && /^-?\d+$/.test(text?.trim()),
  Number: v => v && !isNaN(v),
  Text: v => v && typeof v === 'string',
  Boolean: v => v === true || v === false,
  Null: v => v === null
}

const Widgets = {
  TextField: type => ({
    widget: 'v-text-field',
    params: { type, lazy: true }
  }),
  Select: (items, multiple) => ({
    widget: 'v-select',
    params: { items, multiple }
  }),
  Date: (valueFormat) => ({
    widget: 'v-date-field',
    params: { valueFormat }
    // params: { valueFormat: 'yyyy-MM-dd' }
    // params: { valueFormat: "yyyy-MM-dd'T'HH:mm:ss" }
    // params: { valueFormat: attr.type === 'date' ? 'yyyy-MM-dd' : "yyyy-MM-dd'T'HH:mm:ss.SSS" }
  }),
  DateRange: (valueFormat) => ({
    widget: DateRange,
    params: { valueFormat }
    // params: { valueFormat: 'yyyy-MM-dd' }
    // params: { valueFormat: "yyyy-MM-dd'T'HH:mm:ss" }
  })
}

function BaseFilter (operator, placeholder, validate, widget) {
  return {
    text: Operators[operator] || operator,
    value: operator,
    placeholder,
    validate,
    ...widget
  }
}

function TextFilter (operator, placeholder) {
  return BaseFilter(operator, placeholder, Validators.Text, Widgets.TextField())
}

function NullFilter (operator) {
  return BaseFilter(operator, 'NULL', Validators.Null, { widget: 'v-text-field', params: { readonly: true, value: 'NULL' } })
  // return BaseFilter(operator, 'NULL', Validators.Null)
}

function SimpleNumberFilter (operator, placeholder, typeCheckFn) {
  return BaseFilter(operator, placeholder, typeCheckFn, Widgets.TextField('number'))
}

function createNumericFilters (typeName, typeCheckFn) {
  const simpleNumberOperators = ['=', '!=', '>', '<']
  const listValidator = v => {
    if (!v) {
      return false
    }
    const parts = v.split(',')
    return parts.length > 0 && parts.every(typeCheckFn)
  }
  const rangeValidator = v => {
    if (!v) {
      return false
    }
    const parts = v.split(',')
    return parts.length === 2 && parts.every(typeCheckFn)
  }
  return [
    ...simpleNumberOperators.map(op => SimpleNumberFilter(op, typeName, typeCheckFn)),
    NullFilter('IS NULL'),
    NullFilter('IS NOT NULL'),
    BaseFilter('IN', `${typeName}List`, listValidator, Widgets.TextField('text')),
    BaseFilter('BETWEEN', `${typeName}Range`, rangeValidator, Widgets.TextField('text'))
  ]
}

const BoolItems = [
  { text: 'True', value: true },
  { text: 'False', value: false },
]

const Filters = {
  int: createNumericFilters('Integer', Validators.Integer), // new API
  float: createNumericFilters('Number', Validators.Number), // new API

  integer: createNumericFilters('Integer', Validators.Integer), // old API
  double: createNumericFilters('Number', Validators.Number), // old API
  text: [
    TextFilter('LIKE', 'Text'),
    TextFilter('=', 'Text'),
    TextFilter('!=', 'Text'),
    NullFilter('IS NULL'),
    NullFilter('IS NOT NULL'),
    TextFilter('IN', 'TextList')
  ],
  bool: [
    BaseFilter('=', 'Value', Validators.Boolean, Widgets.Select(BoolItems))
  ]
}

function mapFilters (attribute) {
  const items = valueMapItems(attribute)
  const values = new Set(items.map(i => i.value))
  const singleValueValidator = v => values.has(v)
  const singleTempl = ['Select value', singleValueValidator, Widgets.Select(items)]
  const multipleValuesValidator = v => Array.isArray(v) && v.length > 0 && v.every(singleValueValidator)
  const multiTempl = ['Select values', multipleValuesValidator, Widgets.Select(items, true)]
  return [
    BaseFilter('=', ...singleTempl),
    BaseFilter('!=', ...singleTempl),
    BaseFilter('IN', ...multiTempl),
    BaseFilter('NOT IN', ...multiTempl),
    NullFilter('IS NULL'),
    NullFilter('IS NOT NULL')
  ]
}

function dateFilters (attribute) {
  const valueFormat = attribute.type.toLowerCase() === 'date' ? 'yyyy-MM-dd' : "yyyy-MM-dd'T'HH:mm:ss.SSS"
  return [
    BaseFilter('DATE_EQUAL', 'Date', Validators.Text, Widgets.Date(valueFormat)),
    BaseFilter('SINCE', 'Date', Validators.Text, Widgets.Date(valueFormat)),
    BaseFilter('UNTIL', 'Date', Validators.Text, Widgets.Date(valueFormat)),
    // BaseFilter('DATE_BETWEEN', 'Date', v => Array.isArray(v) && v.length === 2 && v.every(Validators.Text), Widgets.DateRange(valueFormat)),
    BaseFilter('DATE_BETWEEN', 'Date', v => Validators.Text(v?.since) && Validators.Text(v?.until), Widgets.DateRange(valueFormat)),
    NullFilter('IS NULL'),
    NullFilter('IS NOT NULL')
  ]
}

export default {
  name: 'attribute-filter',
  props: {
    attribute: Object,
    filter: Object,
    mobile: Boolean
  },
  computed: {
    classes () {
      return {
        active: this.filter.active,
        mobile: this.mobile
      }
    },
    symbolAttrs () {
      return SymbolAttrs
    },
    type () {
      const { widget, type } = this.attribute
      return widget === 'ValueMap' ? 'map' : type.toLowerCase().replace(/[\d|(|)]/g, '')
    },
    filters () {
      if (this.type === 'map') {
        return mapFilters(this.attribute)
      }
      if (this.type === 'date' || this.type === 'datetime' || this.type === 'timestamp') {
        return dateFilters(this.attribute)
      }
      return Filters[this.type]
    },
    selectedFilter () {
      return this.filter.comparator && this.filters.find(o => o.value === this.filter.comparator)
    },
    placeholder () {
      const placeholder = this.selectedFilter?.placeholder
      return this.tr.placeholders[placeholder] || placeholder
    },
    isValid () {
      return this.filter.valid
    },
    statusColor () {
      return this.filter.active ? this.filter.valid ? 'primary' : 'red' : ''
    },
    tr () {
      return {
        Filter: this.$gettext('Filter'),
        filters: {
          'DATE_EQUAL': this.$gettext('equal to'),
          'DATE_BETWEEN': this.$gettext('between'),
          'SINCE': this.$gettext('since'),
          'UNTIL': this.$gettext('until'),
          '=': this.$gettext('equal to'),
          '!=': this.$gettext('not equal to'),
          '>': this.$gettext('greater than'),
          '<': this.$gettext('less than'),
          'IN': this.$gettext('one of'),
          'NOT IN': this.$gettext('not in'),
          'LIKE': this.$gettext('contain'),
          'IS NULL': this.$gettext('empty'),
          'IS NOT NULL': this.$gettext('not empty'),
          'BETWEEN': this.$gettext('between')
        },
        placeholders: {
          Integer: this.$gettext('Integer'),
          IntegerList: this.$gettext('Integer,Integer,...'),
          IntegerRange: this.$gettext('Integer,Integer'),
          Number: this.$gettext('Number'),
          NumberList: this.$gettext('Number,Number,...'),
          NumberRange: this.$gettext('Number,Number'),
          TextList: this.$gettext('Text,Text,...')
        }
      }
    }
  },
  created () {
    if (this.mobile && this.filter.active && !this.filter.comparator) {
      const comparator = this.filters[0]?.value
      const newValue = this.filterState(comparator, this.filter.value, true)
      this.$emit('change', newValue)
    }
  },
  methods: {
    toggleFilter () {
      const active = !this.filter.active
      let newValue
      if (active && !this.filter.comparator) {
        const comparator = this.filters[0]?.value
        newValue = this.filterState(comparator, this.filter.value, active)
      } else {
        newValue = {...this.filter, active }
      }
      this.$emit('change', newValue)
    },
    operatorChanged (operator) {
      let v = this.filterState(operator, this.filter.value)
      if (!v.valid) {
        v = this.filterState(operator, null)
      }
      this.$emit('change', v)
    },
    onValueChane (val) {
      this.$emit('change', this.filterState(this.filter.comparator, val))
    },
    filterState (comparator, value, active) {
      const validate = this.filters.find(o => o.value === comparator)?.validate
      const valid = validate ? validate(value) : true
      return {
        comparator,
        valid,
        value,
        // value: valid ? value : null,
        active: active === undefined ? this.filter.active : active
      }
    }
  }
}
</script>

<style lang="scss" scoped>
.symbol {
  min-width: 22px;
  font-size: 17px;
  background-color: #f5f5f5;
  border: 1px solid #e3e3e3;
  text-align: center;
  &.small {
    font-size: 13px;
  }
}
.filter {
  font-size: 14px;
  font-weight: normal;
  --icon-color: #777;
  --fill-color: #fff;
  flex-grow: 1;
  display: flex;
  align-items: center;

  // display: grid;
  // grid-template-columns: auto 1fr auto;

  font-size: 13px;
  .select.operator {
    .value {
      font-size: 16px;
      &.small {
        font-size: 12px;
      }
    }
  }
  .text-field {
    min-width: 120px;
    flex: 1 1 0;
  }
  ::v-deep .i-field {
    .input {
      height: 26px;
    }
  }
}
.attr-filter {
  &:not(.active) {
    &.mobile {
      .filter {
        opacity: 0.4;
        pointer-events: none;
      }
    }
    &:not(.mobile) {
      .filter {
        display: none;
      }
    }
  }
}
.attr-filter, .filter {
  gap: 6px;
  --gutter: 0;
}
.btn {
  width: 20px;
  height: 20px;
}
</style>
