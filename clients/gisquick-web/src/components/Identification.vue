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

    <identify-pointer v-if="!editMode" @click="onClick"/>
    <features-viewer :features="displayedFeaures"/>
    <point-marker :coords="mapCoords"/>

    <template v-if="layersFeatures.length">
      <portal to="right-panel">
        <info-panel
          v-if="displayMode === 'info-panel' || displayMode === 'both'"
          class="mx-1 mb-2 elevation-3"
          :features="displayedFeaures"
          :layer="displayedLayer"
          :layers="resultLayers"
          :selected="selection"
          :editMode.sync="editMode"
          @selection-change="selection = $event"
          @close="clearResults"
          @delete="onFeatureDelete"
          @edit="onFeatureEdit"
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

import FeaturesTable from '@/components/FeaturesTable.vue'
import InfoPanel from '@/components/InfoPanel.vue'
import PointMarker from '@/components/ol/PointMarker.vue'
import FeaturesViewer from '@/components/ol/FeaturesViewer.vue'
import { simpleStyle } from '@/map/styles'
import { layersFeaturesQuery, getFeatureByIdQuery } from '@/map/featureinfo'
import { ShallowArray } from '@/utils'

const SelectedStyle = simpleStyle({
  fill: [3, 169, 244, 0.4],
  stroke: [3, 169, 244, 0.9],
  strokeWidth: 3
})

const IdentifyPointer = {
  mounted () {
    const map = this.$map
    map.getViewport().style.cursor = 'crosshair'
    const key = map.on('singleclick', evt => this.$emit('click', evt))
    this.$once('hook:beforeDestroy', () => {
      Observable.unByKey(key)
      map.getViewport().style.cursor = ''
    })
  },
  render: h => null
}

export default {
  name: 'identification',
  components: { InfoPanel, FeaturesTable, PointMarker, FeaturesViewer, IdentifyPointer },
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
      selection: null,
      editMode: false
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
    resultLayers () {
      return this.layersFeatures.map(item => item.layer)
    },
    resultItem () {
      return this.selection && this.layersFeatures.find(i => i.layer.name === this.selection.layer)
    },
    displayedLayer () {
      return this.resultItem && this.resultItem.layer
    },
    displayedFeaures () {
      return this.resultItem && this.resultItem.features
    },
    selectedFeature () {
      return this.selection && this.displayedFeaures[this.selection.featureIndex]
    },
    mapProjection () {
      return this.$map.getView().getProjection().getCode()
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
  methods: {
    async getFeatures (query, params = {}) {
      const config = {
        params: {
          'VERSION': '1.1.0',
          'SERVICE': 'WFS',
          'REQUEST': 'GetFeature',
          'OUTPUTFORMAT': 'GeoJSON',
          ...params
        },
        headers: { 'Content-Type': 'text/xml' }
      }
      const resp = await this.$http.post(this.project.config.ows_url, query, config)
      const parser = new GeoJSON()
      return parser.readFeatures(resp.data, { featureProjection: this.mapProjection })
    },
    async onClick (evt) {
      const { map, pixel } = evt
      this.mapCoords = map.getCoordinateFromPixel(pixel)
      const coords = map.getCoordinateFromPixel(pixel)
      const pixelRadius = 8
      const radius = Math.abs(map.getCoordinateFromPixel([pixel[0] + pixelRadius, pixel[1]])[0] - coords[0])
      const geom = {
        geom: Polygon.fromCircle(new Circle(coords, radius), 6),
        projection: this.mapProjection
      }
      const layers = this.identificationLayer
        ? this.queryableLayers.filter(l => l.name === this.identificationLayer)
        : this.queryableLayers
      const query = layersFeaturesQuery(layers, geom)
      const features = await this.getFeatures(query, { 'MAXFEATURES': 10 })
      const categorizedFeatures = this.categorize(features)
      const items = this.tableData(categorizedFeatures)
      this.layersFeatures = items
      if (items.length) {
        this.selection = {
          layer: items[0].layer.name,
          featureIndex: 0
        }
      } else {
        this.selection = null
      }
    },
    clearResults () {
      this.selection = null
      this.mapCoords = null
      this.layersFeatures = []
      this.editMode = false
    },
    categorize (features) {
      // (WFS layer name cannot contain space character)
      const WfsToLayerName = {}
      this.queryableLayers.forEach(l => {
        WfsToLayerName[l.name.replace(/ /g, '_')] = l.name
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
          features: ShallowArray(groupedFeatures[l.name])
        }))
    },
    onFeatureDelete (feature) {
      this.resultItem.features = this.resultItem.features.filter(f => f !== feature)
      // const index = this.displayedFeaures.indexOf(feature)
      // if (index !== -1) {
      //   this.displayedFeaures.splice(index, 1)
      // }
    },
    async onFeatureEdit (feature) {
      const fid = feature.getId()
      const index = this.resultItem.features.findIndex(f => f.getId() === fid)
      const query = getFeatureByIdQuery(this.resultItem.layer, feature)
      const features = await this.getFeatures(query)
      const newFeature = features[0]
      if (newFeature) {
        // this.displayedFeaures.splice(index, 1, newFeature)
        this.$set(this.displayedFeaures, index, newFeature)
      }
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
