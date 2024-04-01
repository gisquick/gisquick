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

export function filterLayers (items, test) {
  const list = []
  items.forEach(item => {
    if (item.layers) {
      const children = filterLayers(item.layers, test)
      if (children.length) {
        list.push({
          ...item,
          layers: children
        })
      }
    } else if (test(item)) {
      list.push(item)
    }
  })
  return list
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
    activeTool: null,
    showLogin: false,
    baseLayerName: null,
    location: null
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

      const overlaysTree = filterLayers(layers, l => !l.hidden)
      const groups = [].concat(...overlaysTree.map(filterGroups))
      groups.filter(g => !g.virtual_layer).forEach(g => Vue.set(g, 'visible', true))
      groups.filter(g => g.virtual_layer).forEach(g => {
        const layers = layersList(g)
        const visible = layers.some(l => l.visible)
        g.visible = visible // Vue.set(g, 'visible', visible)
        // updates layers visibility for initial map rendering
        layers.forEach(l => l.visible = visible)
      })

      const overlaysList = layersList({ layers })
      overlaysList.filter(l => l.relations).forEach(l => {
        l.relations.forEach(r => {
          r.referencing_layer = overlaysList.find(l => l.name === r.referencing_layer)
        })
      })
      state.project = {
        config: project,
        baseLayers: {
          groups: [].concat(...baseLayers.map(filterGroups)),
          tree: baseLayers,
          list: layersList({ layers: baseLayers })
        },
        overlays: {
          groups,
          tree: overlaysTree,
          list: overlaysList
        }
      }
    },
    activeTool (state, name) {
      state.activeTool = name
    },
    visibleBaseLayer (state, name) {
      state.baseLayerName = name
    },
    groupVisibility (state, { group, visible }) {
      group.visible = visible
      if (group.virtual_layer) {
        layersList(group).forEach(l => l.visible = visible)
      }
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
    },
    showLogin (state, value) {
      state.showLogin = value
    },
    location (state, location) {
      state.location = location
    }
  },
  getters: {
    visibleBaseLayer: state => {
      return state.project?.baseLayers?.list.find(l => l.name === state.baseLayerName)
    },
    visibleLayers: state => {
      if (!state.project) {
        return []
      }
      const { groups, list: layers } = state.project.overlays
      const excluded = [].concat(...groups.filter(g => !g.visible).map(layersList))
      // layers group
      const included = [].concat(...groups.filter(g => g.virtual_layer && g.visible).map(layersList))
      return layers.filter(l => l.drawing_order > -1 && (included.includes(l) || (l.visible && !excluded.includes(l))))
    }
  }
})
