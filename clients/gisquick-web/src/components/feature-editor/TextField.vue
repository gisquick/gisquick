<template>
  <v-text-field
    class="filled"
    :disabled="disabled"
    :value="value"
    :error="error"
    :placeholder="value === null ? 'NULL' : ''"
    v-bind="$attrs"
    v-on="proxyListeners"
    @input="onInput"
  >
    <template v-slot:append>
      <slot name="append"/>
      <v-btn
        v-if="!disabled"
        class="clear icon flat"
        tabindex="-1"
        @click="setNull"
      >
        <v-icon name="delete" size="16"/>
      </v-btn>
    </template>
  </v-text-field>
</template>

<script lang="js">

export default {
  props: {
    disabled: Boolean,
    initial: [String, Number],
    transform: Function,
    value: [String, Number],
    validator: Function
  },
  computed: {
    proxyListeners () {
      const { input, ...listeners } = this.$listeners
      return listeners
    },
    error () {
      return this.validator ? this.validator(this.value) : ''
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
      if (this.transform && (value !== '' || value !== null)) {
        value = this.transform(value)
      }
      this.$emit('input', value)
    }
  }
}
</script>

<style lang="scss" scoped>
.btn.clear {
  margin: 0;
  margin-bottom: auto;
  width: 26px;
  height: 26px;
}
</style>
