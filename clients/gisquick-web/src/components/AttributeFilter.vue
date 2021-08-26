<template>
  <div class="header f-row-ac">
    <span v-text="label"/>
    <div class="filter" v-if="filter.active && filters">
      <v-select
        class="filled"
        :placeholder="tr.Filter"
        :items="filters"
        :value="filter.comparator"
        @input="$emit('input:comparator', $event)"
      >
        <template v-slot:item="{ item }">
          <div class="symbol mx-2">{{ item.text }}</div>
          <span
            v-if="tr.filters[item.value]"
            class="mx-2"
            v-text="tr.filters[item.value]"
          />
        </template>
      </v-select>
      <v-text-field
        v-if="selectedFilter && selectedFilter.inputType"
        class="filled f-grow"
        :placeholder="placeholder"
        :value="filter.value"
        :type="selectedFilter.inputType"
        :disabled="!selectedFilter.inputType"
        :color="isValid ? 'primary' : 'red'"
        @input="$emit('input:value', $event)"
        @keydown.enter="$emit('input:enter')"
      />
      <v-text-field
        v-else
        disabled
        class="filled f-grow"
        :placeholder="selectedFilter && selectedFilter.placeholder"
      />
    </div>
    <v-btn
      class="icon flat ml-auto mr-0"
      :color="filter.active ? 'primary' : ''"
      @click="toggleFilter"
    >
      <v-tooltip slot="tooltip">
        <translate>Filter by attribute value</translate>
      </v-tooltip>
      <v-icon name="filter" size="13"/>
    </v-btn>
  </div>
</template>

<script>

function createNumericFilters (typeName, typeCheckFn) {
  return [
    {
      text: '=',
      value: '=',
      inputType: 'number',
      placeholder: typeName,
      validate: typeCheckFn
    }, {
      text: '≠',
      value: '!=',
      inputType: 'number',
      placeholder: typeName,
      validate: typeCheckFn
    }, {
      text: '>',
      value: '>',
      inputType: 'number',
      placeholder: typeName,
      validate: typeCheckFn
    }, {
      text: '<',
      value: '<',
      inputType: 'number',
      placeholder: typeName,
      validate: typeCheckFn
    // }, {
    //   text: '≥',
    //   value: '>=',
    //   inputType: 'number',
    //   placeholder: typeName,
    //   validate: typeCheckFn
    }, {
      text: '≃',
      value: 'IS NULL',
      placeholder: 'NULL'
    }, {
      text: '≄',
      value: 'IS NOT NULL',
      placeholder: 'NULL'
    }, {
      text: '∊',
      // text: '{ }',
      // text: '｛｝',
      value: 'IN',
      placeholder: `${typeName},${typeName},...`,
      inputType: 'text',
      validate: v => {
        if (!v) {
          return false
        }
        const parts = v.split(',')
        return parts.length > 0 && parts.every(typeCheckFn)
      }
    }, {
      text: '〈 〉',
      // text: '⧼⧽',
      // text: '⟨⟩',
      value: 'BETWEEN',
      placeholder: `${typeName},${typeName}`,
      inputType: 'text',
      validate: v => {
        if (!v) {
          return false
        }
        const parts = v.split(',')
        return parts.length === 2 && parts.every(typeCheckFn)
      }
    }
  ]
}

function isInteger (strValue) {
  return /^-?\d+$/.test(strValue)
}

const Filters = {
  integer: createNumericFilters('Integer', isInteger),
  double: createNumericFilters('Number', v => v && !isNaN(v)),
  text: [
    {
      text: '~',
      value: 'LIKE',
      inputType: 'text',
      placeholder: 'Text',
      validate: v => Boolean(v)
    }, {
      text: '=',
      value: '=',
      inputType: 'text',
      placeholder: 'Text',
      validate: v => Boolean(v)
    }, {
      text: '≠',
      value: '!=',
      inputType: 'text',
      placeholder: 'Text',
      validate: v => Boolean(v)
    }, {
      text: '≃',
      value: 'IS NULL',
      placeholder: 'NULL'
    }, {
      text: '≄',
      value: 'IS NOT NULL',
      placeholder: 'NULL'
    }, {
      text: '∊',
      value: 'IN',
      placeholder: 'Text,Text,...',
      inputType: 'text',
      validate: v => Boolean(v)
    }
  ]
}

export default {
  name: 'attribute-filter',
  props: {
    label: String,
    type: String,
    filter: Object
  },
  computed: {
    baseType () {
      return this.type.replace(/[\d|(|)]/g, '')
    },
    filters () {
      return Filters[this.baseType]
    },
    selectedFilter () {
      return this.filter.comparator && this.filters.find(o => o.value === this.filter.comparator)
    },
    placeholder () {
      return this.selectedFilter?.placeholder
    },
    rules () {
      const validate = this.selectedFilter?.validate
      return validate ? [validate] : []
    },
    isValid () {
      return this.filter.comparator && this.rules.every(validate => validate(this.filter.value))
    },
    tr () {
      return {
        Filter: this.$gettext('Filter'),
        filters: {
          '=': this.$gettext('equal to'),
          '!=': this.$gettext('not equal to'),
          '>': this.$gettext('greater than'),
          '<': this.$gettext('less than'),
          'IN': this.$gettext('one of'),
          'LIKE': this.$gettext('contain'),
          'IS NULL': this.$gettext('empty'),
          'IS NOT NULL': this.$gettext('not empty'),
          'BETWEEN': this.$gettext('between')
        }
      }
    }
  },
  watch: {
    isValid: {
      immediate: true,
      handler (valid) {
        this.$emit('update:error', !valid)
      }
    }
  },
  methods: {
    toggleFilter () {
     this.$emit('input:active', !this.filter.active)
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
  .select {
    ::v-deep .value {
      font-size: 17px;
    }
  }
  .text-field {
    min-width: 120px;
    flex: 1 1 0;
  }
  .i-field ::v-deep {
    .input {
      height: 25px;
    }
  }
}
.header, .filter {
  gap: 6px;
  --gutter: 0;
}
.btn {
  width: 20px;
  height: 20px;
}
</style>
