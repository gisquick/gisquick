<template>
  <div style="display: contents">
    <v-date-field
      :color="color"
      :value-format="valueFormat"
      :value="since"
      @input="sinceChanged"
    />
    <v-date-field
      :color="color"
      :value-format="valueFormat"
      :value="until"
      @input="untilChanged"
    />
  </div>
</template>

<script lang="js">

export default {
  props: {
    color: String,
    value: {},
    valueFormat: String
  },
  computed: {
    since () {
      return this.value?.since
    },
    until () {
      return this.value?.until
    }
  },
  methods: {
    sinceChanged (v) {
      this.$emit('input', { since: v, until: this.until })
    },
    untilChanged (v) {
      this.$emit('input', { since: this.since, until: v })
    }
  }
}
</script>
