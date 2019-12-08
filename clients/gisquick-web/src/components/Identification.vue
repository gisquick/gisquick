<template>
  <div>
    <portal to="main-panel">
      <div class="pa-2" key="identification">
        <v-select
          :value="identificationLayer"
          @input="$emit('update:identificationLayer', $event)"
          :label="tr.Layer"
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
            <text-separator>
              <translate>Display</translate>
            </text-separator>
            <v-list-tile
              v-for="mode in displayModes"
              :key="mode.text"
              class="checkable"
              @click="$emit('update:displayMode', mode.value)"
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
          class="ml-1 mb-2 elevation-3"
          :data="layersFeatures"
          :selected="selection"
          @selection-change="selection = $event"
          @close="clearResults"
        />
      </portal>
      <portal to="bottom-panel">
        <features-table
          v-if="displayMode === 'table' || displayMode === 'both'"
          :data="layersFeatures"
          :selected="selection"
          @selection-change="selection = $event"
          @close="clearResults"
        />
      </portal>
    </template>
  </div>
</template>

<script>
import { mapState } from 'vuex'
import Polygon from 'ol/geom/polygon'
import Circle from 'ol/geom/circle'
import GeoJSON from 'ol/format/geojson'
import Observable from 'ol/observable'
import Feature from 'ol/feature'

import FeaturesTable from './FeaturesTable'
import InfoPanel from './InfoPanel'
import PointMarker from './ol/PointMarker'
import FeaturesViewer from './ol/FeaturesViewer'
import { createStyle } from '@/map/styles'
import { getFeaturesQuery } from '@/map/featureinfo.js'

const SelectedStyle = createStyle([3, 169, 244])

export default {
  name: 'identification',
  components: { InfoPanel, FeaturesTable, PointMarker, FeaturesViewer },
  props: {
    identificationLayer: {
      type: String,
      default: ''
    },
    displayMode: {
      type: String,
      default: 'info-panel'
    }
  },
  data () {
    return {
      mapCoords: null,
      layersFeatures: [],
      selection: null
    }
  },
  computed: {
    ...mapState(['project']),
    queryableLayers () {
      return this.project.overlays.list.filter(l => l.queryable && l.visible && !l.hidden)
    },
    options () {
      const allVisible = {
        title: this.$gettext('All visible layers'),
        name: ''
      }
      return [allVisible].concat(this.queryableLayers)
    },
    displayModes () {
      return [
        {
          text: this.$gettext('Table'),
          value: 'table'
        },
        {
          text: this.$gettext('Info Panel'),
          value: 'info-panel'
        },
        {
          text: this.$gettext('Table & Info Panel'),
          value: 'both'
        }
      ]
    },
    displayedFeaures () {
      const item = this.selection && this.layersFeatures.find(i => i.layer.name === this.selection.layer)
      return item && item.features
    },
    selectedFeature () {
      return this.selection && this.displayedFeaures[this.selection.featureIndex]
    },
    tr () {
      return {
        Layer: this.$gettext('Layer')
      }
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
      const mapProjection = map.getView().getProjection().getCode()

      this.mapClickListener = map.on('singleclick', evt => {
        const pixel = evt.pixel
        const coords = map.getCoordinateFromPixel(pixel)
        const pixelRadius = 8
        const radius = Math.abs(map.getCoordinateFromPixel([pixel[0] + pixelRadius, pixel[1]])[0] - coords[0])
        const identifyGeom = Polygon.fromCircle(new Circle(coords, radius), 6)
        const layers = this.identificationLayer ? [this.identificationLayer] : this.queryableLayers.map(l => l.name)

        const query = getFeaturesQuery(layers, identifyGeom)
        const params = {
          'VERSION': '1.1.0',
          'SERVICE': 'WFS',
          'REQUEST': 'GetFeature',
          'OUTPUTFORMAT': 'GeoJSON',
          'MAXFEATURES': 10
        }
        this.$http.post(this.project.config.ows_url, query, { params, headers: { 'Content-Type': 'text/xml' } })
          .then(resp => {
            const parser = new GeoJSON()
            const features = parser.readFeatures(resp.data, { featureProjection: mapProjection })

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
    clearResults () {
      this.selection = null
      this.mapCoords = null
      this.layersFeatures = []
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
  flex: 0 1 auto;
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
