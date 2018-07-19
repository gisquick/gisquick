<template>
  <v-range-slider
    v-bind="_props"
    @input="handleInput"
  />
</template>

<script>
export default {
  // requires to specify all needed props to propagate them to original rangle slider component
  props: ['value', 'fixed', 'min', 'max', 'hideDetails'],
  methods: {
    _validate (val) {
      if (val[0] < this.min) {
        return [this.min, val[1] + this.min - val[0]]
      }
      if (val[1] > this.max) {
        return [val[0] + this.max - val[1], this.max]
      }
      return val
    },
    handleInput (val) {
      let value = val
      if (this.fixed) {
        if (val[0] !== this.value[0]) {
          value = this._validate([val[0], val[1] + val[0] - this.value[0]])
        }
        if (val[1] !== this.value[1]) {
          value = this._validate([val[0] + val[1] - this.value[1], val[1]])
        }
      }
      this.$emit('input', value)
    }
  }
}
</script>