<template>
  <v-layout class="column my-1">
    <span v-text="label"/>
    <v-layout class="filter row" v-if="filters">
       <!-- VSelect component inside VDataTable is causing errors on reloading (in development) -->
      <v-select
        :placeholder="tr.Filter"
        :items="filters"
        :value="filter.comparator"
        @input="$emit('input:comparator', $event)"
        class="mt-0 mb-0 mr-1"
        hide-details
      >
        <template v-slot:item="{ item }">
          <div class="symbol">{{ item.text }}</div>
          <span
            v-if="tr.filters[item.value]"
            class="description ml-3"
          >
            {{ tr.filters[item.value] }}
          </span>
        </template>
      </v-select>
      <v-text-field
        v-if="selectedFilter && selectedFilter.inputType"
        class="my-0 mr-1"
        :placeholder="placeholder"
        :value="filter.value"
        :type="selectedFilter.inputType"
        :disabled="!selectedFilter.inputType"
        :rules="rules"
        @input="$emit('input:value', $event)"
        @update:error="$emit('update:error', $event)"
        @keydown.enter="$emit('input:enter')"
        hide-details
      />
      <v-text-field
        v-else
        class="my-0 mr-1"
        :placeholder="selectedFilter && selectedFilter.placeholder"
        disabled
      />
      <v-btn
        icon
        class="mx-0 my-0"
        @click="$emit('clear')"
      >
        <icon name="delete"/>
      </v-btn>
    </v-layout>
  </v-layout>
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
      return this.selectedFilter && this.selectedFilter.placeholder
    },
    rules () {
      const validate = this.selectedFilter && this.selectedFilter.validate
      return validate ? [validate] : []
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
    rules () {
      this.validateValue(this.filter.value)
    }
  },
  methods: {
    validateValue (value) {
      const valid = this.rules.every(validate => validate(value))
      if (valid) {
        this.$emit('input:value', value)
        this.$emit('update:error', false)
      } else {
        this.$emit('update:error', true)
      }
    }
  }
}
</script>

<style lang="scss" scoped>
.symbol {
  min-width: 22px;
  font-size: 16px;
  background-color: #f5f5f5;
  border: 1px solid #e3e3e3;
  text-align: center;
}
.description {
  opacity: 0.7;
  margin-bottom: 1px;
}
.filter {
  font-weight: normal;
  .v-select {
    min-width: 48px;
    flex: 0 0 auto;
    /deep/ .v-select__selections {
      height: 28px;
      max-width: 40px; // to make width compact
      font-size: 16px;
      ::placeholder {
        font-size: 13px;
      }
    }
  }
  .v-text-field {
    height: 28px;
    font-size: 14px;
    /deep/ input {
      height: 28px;
    }
    &:not(.v-select) {
      min-width: 100px;
    }
  }
  .v-btn {
    height: 28px;
  }
  .icon {
    width: 1.15em;
    height: 1.15em;
    opacity: 0.7;
  }
}
</style>
