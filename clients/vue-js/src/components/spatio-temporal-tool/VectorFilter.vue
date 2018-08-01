<template>
  <div>
    <!--attributes drop box-->
    <v-select
      label="Select Attribute"
      :items="attributesOptions"
      v-model="filter.attribute"
    />

    <time-field
      :min="range.min"
      :max="range.max"
      v-model="filter.timeRange[0]"
      mask="YYYY-MM-DD"
      label="From"
    />
    <time-field
      :min="filter.timeRange[0]"
      :max="range.max"
      v-model="filter.timeRange[1]"
      mask="YYYY-MM-DD"
      label="To"
    />
    <range-slider
      :min="range.min"
      :max="range.max"
      :fixed="fixedRange"
      :step="step"
      v-model="filter.timeRange"
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
import LayerInfo from './LayerInfo'

let lastState

export default {
  components: { TimeField, RangeSlider },
  inject: ['$map'],
  props: ['input'],
  data () {
    return lastState || {
      step: 100,
      fixedRange: false,
      filter: {
        attribute: null,
        timeRange: [Number.MIN_VALUE, Number.MAX_VALUE]
      }
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
    filterAttribute () {
      if (this.allAttributes.includes(this.filter.attribute)) {
        return this.filter.attribute
      }
      return this.allAttributes[0]
    },
    filterLayers () {
      return this.layers.filter(l => l.original_time_attribute === this.filterAttribute)
    },
    range () {
      return {
        min: Math.min(...this.filterLayers.map(l => l.time_values[0])),
        max: Math.max(...this.filterLayers.map(l => l.time_values[1]))
      }
    },
    currentFilters () {
      const filters = {}
      this.filterLayers.forEach(layer => {
        filters[layer.name] = this.createFilterString(layer, ...this.filter.timeRange)
      })
      return filters
    },
    // string filter identifier just for watcher
    filterKey () {
      return this.filterLayers.map(l => l.name) + ':' + this.filterAttribute
    }
  },
  watch: {
    filterKey: {
      immediate: true,
      handler () {
        const timeLayer = this.filterLayers.find(l => l.timeFilter)
        const timeRange = timeLayer ? timeLayer.timeFilter.timeRange : [Number.MIN_VALUE, Number.MAX_VALUE]
        // create new filter model and use it in all filtered layers
        this.filter = {
          attribute: this.filterAttribute,
          timeRange
        }
        this.filterLayers.forEach(l => this.$set(l, 'timeFilter', this.filter))
      }
    },
    range: {
      immediate: true,
      handler (range) {
        if (this.filter.timeRange[0] < range.min || this.filter.timeRange[0] > range.max) {
          // https://vuejs.org/v2/guide/list.html#Array-Change-Detection
          this.$set(this.filter.timeRange, 0, range.min)
        }
        if (this.filter.timeRange[1] < range.min || this.filter.timeRange[1] > range.max) {
          this.$set(this.filter.timeRange, 1, range.max)
        }
      }
    },
    currentFilters: {
      immediate: true,
      handler () {
        this.updateVectorLayer()
      }
    }
  },
  created () {
    this.$root.$panel.setLayerCustomComponent(LayerInfo)
  },
  beforeDestroy () {
    lastState = this.$data
    this.$root.$panel.setLayerCustomComponent(null)
  },
  methods: {
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
    },
    updateVectorLayer: _debounce(function () {
      this.$map.overlay.getSource().updateFilters(this.currentFilters)
    }, 250)
  }
}
</script>
