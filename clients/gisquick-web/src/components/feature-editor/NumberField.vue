<template>
  <v-text-field
    class="filled"
    type="number"
    :disabled="disabled"
    :value="value"
    :error="error"
    :placeholder="value === null ? 'NULL' : ''"
    v-bind="$attrs"
    v-on="proxyListeners"
    @input="onInput"
  >
    <template v-slot:append>
      <v-btn v-if="!disabled" class="icon" tabindex="-1" @click="setNull">
        <v-icon name="delete" size="16"/>
      </v-btn>
    </template>
  </v-text-field>
</template>

<script lang="js">
function isInteger (strValue) {
  return /^-?\d+$/.test(strValue)
}

export default {
  name: 'NumberField',
  props: {
    disabled: Boolean,
    integer: Boolean,
    rules: Array,
    value: [String, Number]
  },
  computed: {
    validators () {
      const typeCheck = this.integer
        ? v => v && !isInteger(v) ? this.tr.NotValidInteger : false
        : v => v && isNaN(v) ? this.tr.NotValidNumber : false
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
    },
    error () {
      for (const validate of this.validators) {
        const error = validate(this.value)
        if (error) {
          return error
        }
      }
      return ''
    }
  },
  watch: {
    error (err) {
      this.$emit('update:status', err ? 'error' : 'ok')
    }
  },
  methods: {
    setNull () {
      this.$emit('input', null)
    },
    onInput (value) {
      if (value !== '' || value !== null) {
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
