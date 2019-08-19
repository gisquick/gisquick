<template>
  <v-layout class="column filter">
    <span v-text="label"/>
    <v-layout row v-if="operators">
      <v-select
        :placeholder="tr.Operator"
        :items="operators"
        :value="filter.comparator"
        @input="$emit('input:comparator', $event)"
        class="my-1 mr-1"
        hide-details
      />
      <v-text-field
        class="my-1 mr-1"
        :placeholder="placeholder"
        :value="filter.value"
        @input="$emit('input:value', $event)"
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
    operators () {
      return Operators[this.type]
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
  /deep/ .v-select {
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
</style>
