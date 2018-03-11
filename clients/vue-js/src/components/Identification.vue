<template>
  <div>
    <div class="pa-2">
      <v-select
        label="Layer"
        v-model="selected"
        item-text="title"
        item-value="name"
        :items="options"
        :hide-details="true"
      />
    </div>
  </div>
</template>

<script>
import Polygon from 'ol/geom/polygon'
import Circle from 'ol/geom/circle'
import GML3 from 'ol/format/gml3'
import GeoJSON from 'ol/format/geojson'
import Observable from 'ol/observable'
import Feature from 'ol/feature'
import Overlay from 'ol/overlay'

import HTTP from '../client'
import { layersList } from '../map-builder'
import FeaturesTable from './FeaturesTable'
import Marker from '../assets/identification-marker.svg'

let state = null

const defaultOption = {
  title: 'All visible layers',
  name: ''
}
export default {
  name: 'identification',
  icon: 'identification',
  inject: ['$project', '$map'],
  data: () => state || ({
    selected: defaultOption.name
  }),
  computed: {
    layers () {
      return layersList(this.$project.layers).filter(l => l.queryable && l.visible && !l.hidden)
    },
    options () {
      return [defaultOption].concat(this.layers)
    }
  },
  mounted () {
    this.activate()
  },
  activated () {
    this.activate()
  },
  beforeDestroy () {
    this.deactivate()
    state = this.$data
  },
  deactivated () {
    this.deactivate()
  },
  methods: {
    createPointer () {
      const map = this.$map
      const img = new Image()
      img.src = Marker
      const overlay = new Overlay({
        element: img,
        positioning: 'center-center'
      })
      overlay.setMap(map)
      return overlay
    },
    activate () {
      // register click events listener on map with
      // WFS GetFeature features identification
      const map = this.$map
      this.pointer = this.createPointer()

      this.mapClickListener = map.on('singleclick', evt => {
        // featuresViewer.removeAllFeatures()

        const pixel = evt.pixel
        const coords = map.getCoordinateFromPixel(pixel)
        const pixelRadius = 8
        const radius = Math.abs(map.getCoordinateFromPixel([pixel[0] + pixelRadius, pixel[1]])[0] - coords[0])

        var identifyPolygon = Polygon.fromCircle(new Circle(coords, radius), 6)
        const identifyPolygonGml = new GML3().writeGeometryNode(identifyPolygon).innerHTML

        const filter = [
          '<Filter>',
          '<ogc:Intersects>',
          '<ogc:PropertyName>geometry</ogc:PropertyName>',
          identifyPolygonGml,
          '</ogc:Intersects>',
          '</Filter>'
        ].join('')

        const layers = !this.selected
          ? this.layers.map(l => l.name).join(',')
          : this.selected
        const params = {
          'VERSION': '1.0.0',
          'SERVICE': 'WFS',
          'REQUEST': 'GetFeature',
          'OUTPUTFORMAT': 'GeoJSON',
          'TYPENAME': layers.replace(/ /g, ''),
          'MAXFEATURES': 10,
          'FILTER': filter
        }
        const url = HTTP.appendParams(this.$project.ows_url, params)
        HTTP.get(url).then(resp => {
          const parser = new GeoJSON()
          const features = parser.readFeatures(resp.data)

          const categorizedFeatures = this.categorize(features)
          const items = this.tableData(categorizedFeatures)

          // console.log(features)
          // console.log(categorizedFeatures)
          // console.log(items)

          this.$root.$panel.setBottomPanel(
            FeaturesTable,
            Object.freeze({data: items})
          )
        })
        this.pointer.setPosition(map.getCoordinateFromPixel(pixel))
        // tool._markerOverlay.setPosition(projectProvider.map.getCoordinateFromPixel(pixel))
      })
      map.getViewport().style.cursor = 'crosshair'
    },
    deactivate () {
      Observable.unByKey(this.mapClickListener)
      this.$map.getViewport().style.cursor = ''
      this.$root.$panel.setBottomPanel(null)
      if (this.pointer) {
        this.pointer.setMap(null)
      }
    },
    categorize (features) {
      // (WFS layer name cannot contain space character)
      const WfsToLayerName = {}
      this.layers.forEach(l => {
        WfsToLayerName[l.name.replace(/ /g, '')] = l.name
      })

      // group features by layer name
      const layersFeatures = {}
      if (features.length > 0) {
        features.forEach(feature => {
          if (feature instanceof Feature) {
            const fid = feature.getId()
            const layer = WfsToLayerName[fid.substring(0, fid.lastIndexOf('.'))]
            if (!layersFeatures[layer]) {
              layersFeatures[layer] = []
            }
            layersFeatures[layer].push(feature)
          }
        })
      }
      return layersFeatures
    },
    tableData (groupedFeatures) {
      const matchedLayers = Object.keys(groupedFeatures)
      return this.layers
        .filter(l => matchedLayers.includes(l.name))
        .map(l => ({
          layer: l,
          features: groupedFeatures[l.name]
        }))
    }
  }
}
</script>
