<template>
  <div>
    <portal to="main-panel">
      <div class="pa-2" key="identification">
        <v-select
          label="Layer"
          v-model="identificationLayer"
          item-text="title"
          item-value="name"
          :items="options"
          :hide-details="true"
        />
        <v-menu bottom left content-class="identification-menu">
          <v-btn icon slot="activator">
            <v-icon>more_vert</v-icon>
          </v-btn>
          <v-list>
            <text-separator>Display</text-separator>
            <v-list-tile
              v-for="mode in displayModes"
              :key="mode.text"
              class="checkable"
              @click="displayMode = mode.value"
            >
              <v-icon
                class="check"
                v-show="mode.value === displayMode">check
              </v-icon>
              <v-list-tile-title>{{ mode.text }}</v-list-tile-title>
            </v-list-tile>
          </v-list>
        </v-menu>
      </div>
    </portal>

    <features-viewer :features="displayedFeaures"/>
    <point-marker :coords="mapCoords"/>

    <template v-if="layersFeatures.length">
      <portal to="right-panel">
        <info-panel
          v-if="displayMode === 'info-panel' || displayMode === 'both'"
          class="ml-1 elevation-6"
          :data="layersFeatures"
          :selected="selection"
          @selection-change="selection = $event"
        />
      </portal>
      <portal to="bottom-panel">
        <features-table
          v-if="displayMode === 'table' || displayMode === 'both'"
          :data="layersFeatures"
          :selected="selection"
          @selection-change="selection = $event"
          @close="$emit('close')"
        />
      </portal>
    </template>
  </div>
</template>

<script>
import { mapState, mapGetters } from 'vuex'
import Polygon from 'ol/geom/polygon'
import Circle from 'ol/geom/circle'
import GML3 from 'ol/format/gml3'
import GeoJSON from 'ol/format/geojson'
import Observable from 'ol/observable'
import Feature from 'ol/feature'

import FeaturesTable from './FeaturesTable'
import InfoPanel from './InfoPanel'
import PointMarker from './ol/PointMarker'
import FeaturesViewer, { createStyle } from './ol/FeaturesViewer'


const SelectedStyle = createStyle([3, 169, 244])

const defaultOption = {
  title: 'All visible layers',
  name: ''
}
const DisplayModes = [
  {
    text: 'Table',
    value: 'table'
  },
  {
    text: 'Info Panel',
    value: 'info-panel'
  },
  {
    text: 'Table & Info Panel',
    value: 'both'
  }
]
const data = {
  mapCoords: null,
  identificationLayer: defaultOption.name,
  layersFeatures: [],
  selection: null,
  displayMode: 'both'
}

export default {
  name: 'identification',
  components: { InfoPanel, FeaturesTable, PointMarker, FeaturesViewer },
  data () {
    return data
  },
  computed: {
    ...mapState(['project']),
    queryableLayers () {
      return this.project.overlays.list.filter(l => l.queryable && l.visible && !l.hidden)
    },
    options () {
      return [defaultOption].concat(this.queryableLayers)
    },
    displayModes () {
      return DisplayModes
    },
    displayedFeaures () {
      const item = this.selection && this.layersFeatures.find(i => i.layer.name === this.selection.layer)
      return item && item.features
    },
    selectedFeature () {
      return this.selection && this.displayedFeaures[this.selection.featureIndex]
    }
  },
  watch: {
    selectedFeature (feature, oldFeature) {
      if (oldFeature) {
        oldFeature.setStyle(null)
      }
      if (feature) {
        feature.setStyle(SelectedStyle)
      }
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

        const layers = this.identificationLayer || this.queryableLayers.map(l => l.name).join(',')
        const params = {
          'VERSION': '1.0.0',
          'SERVICE': 'WFS',
          'REQUEST': 'GetFeature',
          'OUTPUTFORMAT': 'GeoJSON',
          'TYPENAME': layers.replace(/ /g, ''),
          'MAXFEATURES': 10,
          'FILTER': filter
        }

        this.$http.get(this.project.config.ows_url, { params })
          .then(resp => {
            const parser = new GeoJSON()
            const features = parser.readFeatures(resp.data)

            const categorizedFeatures = this.categorize(features)
            const items = this.tableData(categorizedFeatures)

            this.layersFeatures = Object.freeze(items)
            if (items.length) {
              this.selection = {
                layer: items[0].layer.name,
                featureIndex: 0
              }
            } else {
              this.selection = null
            }
          })
        this.mapCoords = map.getCoordinateFromPixel(pixel)
      })
      map.getViewport().style.cursor = 'crosshair'
    },
    deactivate () {
      Observable.unByKey(this.mapClickListener)
      this.$map.getViewport().style.cursor = ''
      if (this.pointer) {
        this.pointer.setMap(null)
      }
    },
    categorize (features) {
      // (WFS layer name cannot contain space character)
      const WfsToLayerName = {}
      this.queryableLayers.forEach(l => {
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
      return this.queryableLayers
        .filter(l => matchedLayers.includes(l.name))
        .map(l => ({
          layer: l,
          features: groupedFeatures[l.name]
        }))
    }
  }
}
</script>

<style lang="scss" scoped>
.info-panel {
  max-height: 100%;
  min-height: 150px;
  flex: 1 1;
  overflow: auto;
}
.v-menu {
  position: absolute;
  right: 0;
  top: 0;
  .v-menu__activator .v-btn {
    color: #aaa;
    margin: 0;
  }
}
</style>
