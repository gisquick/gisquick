<template>
  <v-menu
    v-model="open"
    lazy
    offset-y
    full-width
    min-width="290px"
    transition="scale-transition"
    :close-on-content-click="false"
  >
    <v-text-field
      slot="activator"
      :value="outputFormat"
      :label="label"
      prepend-icon="event"
      readonly
    />
    <v-date-picker
      no-title
      scrollable
      :min="minDate"
      :max="maxDate"
      v-model="pickedDate"
    >
      <v-spacer/>
      <v-btn
        flat
        color="primary"
        @click="close">Cancel
      </v-btn>
      <v-btn
        flat
        color="primary"
        @click="update">OK
      </v-btn>
    </v-date-picker>
  </v-menu>
</template>

<script>
import moment from 'moment'

export default {
  props: {
    // unix timestamps
    min: Number,
    max: Number,
    value: Number,

    time: {
      type: Boolean,
      default: false
    },
    mask: {
      type: String,
      default: 'YYYY-MM-DD'
    },
    label: String
  },
  data () {
    return {
      open: false,
      pickedDate: null
    }
  },
  computed: {
    minDate () {
      if (Number.isInteger(this.min)) {
        return moment.unix(this.min).toISOString()
      }
    },
    maxDate () {
      if (Number.isInteger(this.max)) {
        return moment.unix(this.max).toISOString()
      }
    },
    moment () {
      return moment.unix(this.value)
    },
    outputFormat () {
      return this.moment.format(this.mask)
    }
  },
  watch: {
    open (value) {
      if (value) {
        this.pickedDate = this.moment.toISOString()
      }
    }
  },
  methods: {
    close () {
      this.open = false
    },
    update () {
      const date = moment(this.pickedDate, this.mask)
      this.$emit('input', date.unix())
      this.close()
    }
  }
}
</script>
