import Vue from 'vue'
import Vuex from 'vuex'
import attributeTable from './attribute-table'

Vue.use(Vuex)

function layersList (node) {
  return node.layers ? [].concat(...node.layers.map(layersList)) : [node]
}

function filterGroups (node) {
  return node.layers ? [node].concat(...node.layers.map(filterGroups)) : []
}

export default new Vuex.Store({
  strict: process.env.NODE_ENV === 'development',
  modules: {
    attributeTable
  },
  state: {
    app: null,
    user: null,
    project: null,
    activeTool: null
  },
  mutations: {
    app (state, app) {
      state.app = app
    },
    user (state, user) {
      state.user = user
    },
    project (state, project) {
      if (!project) {
        state.project = null
        return
      }
      const { base_layers: baseLayers = [], layers = [] } = project

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
    activeTool (state, name) {
      state.activeTool = name
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
      return state.project && state.project.baseLayers.list.find(l => l.visible)
    },
    visibleLayers: state => {
      if (!state.project) {
        return []
      }
      const { groups, list: layers } = state.project.overlays
      const excluded = [].concat(...groups.filter(g => !g.visible).map(layersList))
      return layers.filter(l => l.visible && !excluded.includes(l))
    }
  }
})
