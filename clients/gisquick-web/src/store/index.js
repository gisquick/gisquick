import Vue from 'vue'
import Vuex from 'vuex'
import attributeTable from './attribute-table'

Vue.use(Vuex)

function layersList (node) {
  return node.layers ? [].concat(...node.layers.map(layersList)) : [node]
}

function groupsList (node) {
  return node.layers ? [node].concat(...node.layers.map(groupsList)) : []
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
    options: {
      groupVisibilityMode: 0 // 0 - exclude layers when visibility is off, 1 - set visibility of the layers
    },
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
      layersList({ layers }).forEach(l => Vue.set(l, 'opacity', 255))
      const overlaysTree = filterLayers(layers, l => !l.hidden)
      const groups = [].concat(...overlaysTree.map(filterGroups))
      groups.filter(g => !g.id).forEach((g, i) => Vue.set(g, 'id', `__o_group-${i}`))
      groups.filter(g => !g.virtual_layer).forEach(g => Vue.set(g, 'visible', true))
      groups.filter(g => g.virtual_layer).forEach(g => {
        const layers = layersList(g)
        const visible = layers.some(l => l.visible)
        g.visible = visible // Vue.set(g, 'visible', visible)
        // updates layers visibility for initial map rendering
        layers.forEach(l => l.visible = visible)
      })

      if (state.options.groupVisibilityMode === 1) {
        groups.filter(g => !g.virtual_layer).forEach(g => {
          const layers = layersList(g)
          const visible = layers.some(l => l.visible)
          g.visible = visible // Vue.set(g, 'visible', visible)
        })
      }

      const overlaysList = layersList({ layers })
      const projectData = {
        config: project,
        baseLayers: {
          groups: [].concat(...baseLayers.map(filterGroups)),
          tree: baseLayers,
          list: layersList({ layers: baseLayers })
        },
        overlays: {
          groups,
          tree: overlaysTree,
          list: overlaysList,
          byName:overlaysList.reduce((t, l) => (t[l.name] = l, t), {})
        }
      }
      projectData.overlays.list.filter(l => l.relations?.length).forEach(l => {
        l.relations = l.relations.filter(r => {
          const rlayer = projectData.overlays.byName[r.referencing_layer]
          return rlayer
            && r.referenced_fields.every(field => l.attributes?.some(a => a.name === field))
            && r.referencing_fields.every(field => rlayer.attributes?.some(a => a.name === field))
        })
      })
      state.project = projectData
    },
    activeTool (state, name) {
      state.activeTool = name
    },
    visibleBaseLayer (state, name) {
      state.baseLayerName = name
    },
    groupVisibility (state, { group, visible }) {
      group.visible = visible
      const { groupVisibilityMode } = state.options
      if (groupVisibilityMode === 0) {
        if (group.virtual_layer) {
          layersList(group).forEach(l => l.visible = visible)
        }
      } else if (groupVisibilityMode === 1) {
        layersList(group).forEach(l => l.visible = visible)
        groupsList(group).forEach(g => g.visible = visible)
        do {
          group.visible = group.layers.some(l => l.visible)
          group = state.project.overlays.groups.find(g => g.layers.includes(group))
        } while (group)
      }
    },
    layerVisibility (state, { layer, visible }) {
      let group = state.project.overlays.groups.find(g => g.layers.includes(layer))
      if (group?.mutually_exclusive) {
        const offLayers = group.layers.filter(l => l.visible && l !== layer)
        offLayers.forEach(l => l.visible = false)
      }
      layer.visible = visible
      if (group && state.options.groupVisibilityMode === 1) {
        do {
          group.visible = group.layers.some(l => l.visible)
          group = state.project.overlays.groups.find(g => g.layers.includes(group))
        } while (group)
      }
    },
    visibleLayers (state, layersNames) {
      state.project.overlays.list
        .filter(l => !l.hidden) // hidden layers should be always visible
        .forEach(l => {
          l.visible = layersNames.includes(l.name)
        })
    },
    layerOpacity (state, { layer, opacity }) {
      layer.opacity = opacity
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
      let excluded = []
      if (state.options.groupVisibilityMode === 0) {
        excluded = [].concat(...groups.filter(g => !g.visible).map(layersList))
      }
      const included = [].concat(...groups.filter(g => g.virtual_layer && g.visible).map(layersList))
      return layers.filter(l => l.drawing_order > -1 && (included.includes(l) || (l.visible && !excluded.includes(l))))
    }
  }
})
