<template>
  <v-layout class="column my-1">
    <span v-text="label"/>
    <v-layout class="filter row" v-if="operators">
      <v-select
        :placeholder="tr.Operator"
        :items="operators"
        :value="filter.comparator"
        @input="$emit('input:comparator', $event)"
        class="mt-0 mb-0 mr-1"
        hide-details
      />
      <v-text-field
        class="my-0 mr-1"
        :placeholder="placeholder"
        :value="filter.value"
        @input="$emit('input:value', $event)"
        @keydown.enter="$emit('input:enter')"
        hide-details
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
function numericOperators (type) {
  return [
    {
      text: '=',
      value: '=',
      placeholder: type
    },
    {
      text: '!=',
      value: '!=',
      placeholder: type
    },
    {
      text: '<',
      value: '<',
      placeholder: type
    },
    {
      text: '<=',
      value: '<=',
      placeholder: type
    },
    {
      text: '>',
      value: '>',
      placeholder: type
    },
    {
      text: '>=',
      value: '>=',
      placeholder: type
    },
    {
      text: 'IN',
      value: 'IN',
      placeholder: `${type},${type},...`
    },
    {
      text: 'BETWEEN',
      value: 'BETWEEN',
      placeholder: `${type},${type}`
    }
  ]
}
const Operators = {
  text: [
    {
      text: '=',
      value: '=',
      placeholder: 'Text'
    },
    {
      text: '!=',
      value: '!=',
      placeholder: 'Text'
    },
    {
      text: 'LIKE',
      value: '~',
      placeholder: 'Text'
    },
    {
      text: 'IN',
      value: 'IN',
      placeholder: 'Text'
    }
  ],
  integer: numericOperators('Integer'),
  double: numericOperators('Real')
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
    operators () {
      return Operators[this.baseType]
    },
    placeholder () {
      if (!this.filter.comparator) {
        return ''
      }
      return this.operators.find(op => op.value === this.filter.comparator).placeholder
    },
    tr () {
      return {
        Operator: this.$gettext('Operator')
      }
    }
  }
}
</script>

<style lang="scss" scoped>
.filter {
  font-weight: normal;
  .v-select {
    width: auto;
    flex: 0 0 auto;
    /deep/ .v-select__selections {
      height: 28px;
      max-width: 52px; // to make width compact
      font-size: 13px;
    }
  }
  .v-text-field {
    min-width: 100px;
    height: 28px;
    font-size: 14px;
    /deep/ input {
      height: 28px;
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
