import Vue from 'vue'
import keyBy from 'lodash/keyBy'

import config from './components'

function layersList (node) {
  return node.layers ? [].concat(...node.layers.map(layersList)) : [node]
}

// function layersDict (node) {
//   return node.layers ? Object.assign({}, ...node.layers.map(layersDict)) : { [node.name]: node }
// }

export function extendProject (project) {
  const layersMap = keyBy(layersList({ layers: project.layers }), 'name')
  // const layersMap = layersDict({ layers: project.layers })

  config.infoPanelComponents?.forEach(i => {
    const name = i.component.name
    Vue.component(name, i.component)
    const layer = layersMap[i.layer]
    if (layer) {
      layer.infopanel_component = name
    } else {
      console.error(`Layer does not exist: '${i.layer}'`)
    }
  })
  return project
}
