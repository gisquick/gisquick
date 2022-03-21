<template>
  <div style="display: contents">
    <date-field
      :color="color"
      :value-format="valueFormat"
      :value="since"
      @input="sinceChanged"
    />
    <date-field
      :color="color"
      :value-format="valueFormat"
      :value="until"
      @input="untilChanged"
    />
  </div>
</template>

<script>
import DateField from '@/ui/DateField.vue'

export default {
  components: { DateField },
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
