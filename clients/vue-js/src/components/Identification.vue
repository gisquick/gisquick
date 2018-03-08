<template>
  <div>
<!--     <v-toolbar dark flat height="30">
      <v-spacer></v-spacer>
      <h4>Identification</h4>
      <v-spacer></v-spacer>
      <v-btn flat @click="$emit('close')"><v-icon>close</v-icon></v-btn>
    </v-toolbar> -->
    <div class="pa-2">
      <v-select
        label="Layer"
        :items="layers"
        v-model="selected"
        item-text="title"
        item-value="name"
        placeholder="Select layer"
        :hide-details="true"
      ></v-select>
    </div>
  </div>
</template>

<script>
import Polygon from 'ol/geom/polygon'
import Circle from 'ol/geom/circle'
import GML3 from 'ol/format/gml3'
import GeoJSON from 'ol/format/geojson'
import Observable from 'ol/observable'

import HTTP from '../client'
import { layersList } from '../map-builder'

export default {
  name: 'identification',
  icon: 'identification',
  inject: ['$project', '$map'],
  data: () => ({
    selected: null
  }),
  computed: {
    layers () {
      return layersList(this.$project.layers).filter(l => l.queryable && l.visible)
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
  },
  deactivated () {
    this.deactivate()
  },
  methods: {
    activate () {
      // register click events listener on map with
      // WFS GetFeature features identification
      const map = this.$map
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
          console.log(features)
        })
        // tool._markerOverlay.setPosition(projectProvider.map.getCoordinateFromPixel(pixel))
      })
      map.getViewport().style.cursor = 'crosshair'
    },
    deactivate () {
      Observable.unByKey(this.mapClickListener)
      this.$map.getViewport().style.cursor = ''
    }
  }
}
</script>