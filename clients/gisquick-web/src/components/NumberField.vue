<template>
  <v-text-field
    type="number"
    v-bind="$attrs"
    :rules="allRules"
    v-on="proxyListeners"
    @input="onInput"
  />
</template>

<script>
function isInteger (strValue) {
  return /^-?\d+$/.test(strValue)
}

export default {
  name: 'NumberField',
  props: {
    integer: Boolean,
    rules: Array
  },
  computed: {
    allRules () {
      const typeCheck = this.integer
        ? v => v && !isInteger(v) ? this.tr.NotValidInteger : true
        : v => v && isNaN(v) ? this.tr.NotValidNumber : true
      return Array.isArray(this.rules) ? [typeCheck, ...this.rules] : [typeCheck]
    },
    proxyListeners () {
      const { input, ...listeners } = this.$listeners
      return listeners
    },
    tr () {
      return {
        NotValidNumber: this.$gettext('Not valid number'),
        NotValidInteger: this.$gettext('Not valid integer number')
      }
    }
  },
  methods: {
    onInput (value) {
      if (value !== '') {
        // conversion from String to Number
        if (this.integer) {
          if (isInteger(value)) {
            value = parseInt(value)
          }
        } else {
          if (!isNaN(value)) {
            value = parseFloat(value)
          }
        }
      }
      this.$emit('input', value)
    }
  }
}
</script>
