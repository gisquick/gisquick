import Vue from 'vue'

export default {
  namespaced: true,
  state: {
    limit: 5,
    visibleAreaFilter: false,
    layer: null,
    filters: {},
    features: []
  },
  getters: {
    layerFilters (state) {
      return state.layer && state.filters[state.layer.name]
    }
  },
  mutations: {
    layer (state, layer) {
      state.layer = layer
      if (!state.filters[layer.name]) {
        const filters = {}
        layer.attributes.forEach(attr => {
          filters[attr.name] = {
            comparator: null,
            value: null,
            valid: false
          }
        })
        // state.filters[layer.name] = filters
        Vue.set(state.filters, layer.name, filters)
      }
    },
    features (state, features) {
      state.features = features
    },
    visibleAreaFilter (state, visible) {
      state.visibleAreaFilter = visible
    },
    updateFilterComparator (state, { attr, comparator }) {
      const filter = state.filters[state.layer.name][attr]
      filter.comparator = comparator
    },
    updateFilterValue (state, { attr, value }) {
      const filter = state.filters[state.layer.name][attr]
      filter.value = value
    },
    updateFilterValidity (state, { attr, valid }) {
      const filter = state.filters[state.layer.name][attr]
      filter.valid = valid
    },
    clearFilter (state, attr) {
      const filter = state.filters[state.layer.name][attr]
      filter.comparator = null
      filter.value = null
      filter.valid = false
    },
    limit (state, value) {
      state.limit = Math.min(value, 1000)
    }
  }
}
