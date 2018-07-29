<template>
  <div>
    <!--attributes drop box-->
    <v-select
      v-if="allAttributes.length > 1"
      label="Select Attribute"
      :items="attributesOptions"
      v-model="attribute"
    />

    <time-field
      :min="range.min"
      :max="range.max"
      v-model="timeRange[0]"
      mask="YYYY-MM-DD"
      label="From"
    />
    <time-field
      :min="timeRange[0]"
      :max="range.max"
      v-model="timeRange[1]"
      mask="YYYY-MM-DD"
      label="To"
    />
    <range-slider
      :min="range.min"
      :max="range.max"
      :fixed="fixedRange"
      :step="step"
      v-model="timeRange"
      class="mx-2"
      hide-details
    />
    <v-checkbox
      color="primary"
      label="Fixed range"
      v-model="fixedRange"
      hide-details
    />
  </div>
</template>

<script>
import moment from 'moment'
// import _throttle from 'lodash/throttle'
import _debounce from 'lodash/debounce'
import TimeField from './TimeField'
import RangeSlider from './RangeSlider1'

let lastState

export default {
  components: { TimeField, RangeSlider },
  inject: ['$map'],
  props: ['input'],
  data () {
    return lastState || {
      step: 100,
      attribute: null,
      fixedRange: false,
      timeRange: [Number.MIN_VALUE, Number.MAX_VALUE]
    }
  },
  computed: {
    layers () {
      return Array.isArray(this.input) ? this.input : [this.input]
    },
    allAttributes () {
      return [...new Set(this.layers.map(l => l.original_time_attribute))]
    },
    attributesOptions () {
      if (this.allAttributes.length > 1) {
        return ['All attributes', ...this.allAttributes]
      }
      return this.allAttributes
    },
    range () {
      return {
        min: Math.min(...this.layers.map(l => l.time_values[0])),
        max: Math.max(...this.layers.map(l => l.time_values[1]))
      }
    },
    filter () {
      const filters = []
      const attribute = this.attribute || this.allAttributes[0]
      if (attribute) {
        this.layers
          .filter(layer => layer.visible)
          .forEach(layer => {
            filters.push(this.createFilterString(layer, ...this.timeRange))
          })
      }
      return filters.join(';')
    }
  },
  watch: {
    range: {
      immediate: true,
      handler (range) {
        if (this.timeRange[0] < range.min || this.timeRange[0] > range.max) {
          // https://vuejs.org/v2/guide/list.html#Array-Change-Detection
          this.$set(this.timeRange, 0, range.min)
        }
        if (this.timeRange[1] < range.min || this.timeRange[1] > range.max) {
          this.$set(this.timeRange, 1, range.max)
        }
      }
    },
    filter: {
      immediate: true,
      handler () {
        this.updateVectorLayer()
      }
    }
  },
  beforeDestroy () {
    lastState = this.$data
  },
  methods: {
    updateVectorLayer: _debounce(function () {
      this.$map.overlay.getSource().updateParams({'FILTER': this.filter})
    }, 250),
    createFilterString (layer, min, max) {
      if (layer.unix) {
        return this.createLayerFilterString(layer.name, layer.time_attribute, min, max)
      } else {
        return this.createLayerFilterString(
          layer.name,
          layer.original_time_attribute,
          moment(min * 1000).format(layer.input_datetime_mask),
          moment(max * 1000).format(layer.input_datetime_mask)
        )
      }
    },
    createLayerFilterString (layerName, attribute, min, max) {
      return `${layerName}:"${attribute}" >= '${min}' AND "${attribute}" <= '${max}'`
    }
  }
}
</script>
