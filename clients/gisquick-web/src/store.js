import Vue from 'vue'
import Vuex from 'vuex'

Vue.use(Vuex)

function layersList (node) {
  return node.layers ? [].concat(...node.layers.map(layersList)) : [node]
}

function filterGroups (node) {
  return node.layers ? [node].concat(...node.layers.map(filterGroups)) : []
}

export default new Vuex.Store({
  strict: process.env.NODE_ENV === 'development',
  state: {
    app: {},
    project: null
  },
  mutations: {
    app (state, config) {
      state.app = config
    },
    project (state, project) {
      const { base_layers: baseLayers, layers, ...rest } = project

      const groups = [].concat(...layers.map(filterGroups))
      groups.forEach(l => { l.visible = true })

      state.project = {
        config: project,
        baseLayers: {
          tree: baseLayers,
          list: layersList({ layers: baseLayers })
        },
        overlays: {
          groups,
          tree: layers,
          list: layersList({ layers })
        }
      }
    },
    visibleBaseLayer (state, name) {
      state.project.baseLayers.list.forEach(l => {
        l.visible = l.name === name
      })
    },
    layerVisibility (state, { layer, visible }) {
      layer.visible = visible
    },
    visibleLayers (state, layersNames) {
      state.project.overlays.list
        .filter(l => !l.hidden) // hidden layers should be always visible
        .forEach(l => {
          l.visible = layersNames.includes(l.name)
        })
    }
  },
  getters: {
    visibleBaseLayer: state => {
      return state.project.baseLayers.list.find(l => l.visible)
    },
    visibleLayers: state => {
      const { groups, list: layers } = state.project.overlays
      const excluded = [].concat(...groups.filter(g => !g.visible).map(layersList))
      return layers.filter(l => l.visible && !excluded.includes(l))
    }
  }
})
