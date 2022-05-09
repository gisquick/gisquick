<template>
  <div>
    <portal to="main-panel">
      <div class="identification-tool light f-row f-align-start" key="identification">
        <v-select
          class="flat f-grow"
          :label="tr.Layer"
          item-text="title"
          item-value="name"
          :value="identificationLayer"
          :items="options"
          @input="$emit('update:identificationLayer', $event)"
        />
        <v-menu
          :aria-label="tr.Menu"
          transition="slide-y"
          align="rr;bb,tt"
          :items="displayModes"
          @confirm="$emit('update:displayMode', $event.value)"
        >
          <template v-slot:activator="{ toggle }">
            <v-btn
              :aria-label="tr.Menu"
              class="icon small"
              @click="toggle"
            >
              <v-icon name="menu-dots"/>
            </v-btn>
          </template>
        </v-menu>
      </div>
    </portal>

    <identify-pointer v-if="!editMode" @click="onClick"/>
    <features-viewer :features="displayedFeaures"/>
    <point-marker :coords="mapCoords" :error="error" :loading="loading"/>

    <template v-if="layersFeatures.length">
      <portal to="right-panel">
        <info-panel
          v-if="displayMode === 'info-panel' || displayMode === 'both'"
          class="mx-1 mb-2 shadow-2"
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
          class="light"
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
import { formatFeatures } from '@/formatters'

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
  render: () => null
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
      editMode: false,
      loading: false, // use TaskState & watchTask?
      error: false
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
      const options = [
        { value: 'table', text: this.$gettext('Table') },
        { value: 'info-panel', text: this.$gettext('Info Panel') },
        { value: 'both', text: this.$gettext('Table & Info Panel') },
      ]
      return options.map(item => ({ ...item, checked: this.displayMode === item.value }))
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
        Layer: this.$gettext('Layer'),
        Menu: this.$gettext('Menu')
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
      this.loading = true
      this.error = false
      try {
        const resp = await this.$http.post(this.project.config.ows_url, query, config)
        const parser = new GeoJSON()
        return parser.readFeatures(resp.data, { featureProjection: this.mapProjection })
      } catch {
        this.error = true
        return []
      } finally {
        this.loading = false
      }
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
          features: ShallowArray(formatFeatures(this.project, l, groupedFeatures[l.name]))
        }))
    },
    onFeatureDelete (feature) {
      this.editMode = false
      // update list of features and selection
      const currentLayerFeatures = this.resultItem.features.filter(f => f !== feature)
      if (currentLayerFeatures.length) {
        this.resultItem.features = currentLayerFeatures
        this.selection.featureIndex = 0
      } else {
        this.layersFeatures = this.layersFeatures.filter(i => i.layer !== this.resultItem)
        if (this.layersFeatures.length) {
          this.selection = {
            layer: this.layersFeatures[0].layer.name,
            featureIndex: 0
          }
        } else {
          this.selection = null
        }
      }
      this.$map.ext.refreshOverlays()
    },
    async onFeatureEdit (feature) {
      const fid = feature.getId()
      const index = this.resultItem.features.findIndex(f => f.getId() === fid)
      const query = getFeatureByIdQuery(this.resultItem.layer, feature)
      const features = await this.getFeatures(query)
      formatFeatures(this.project, this.displayedLayer, features)
      const newFeature = features[0]
      if (newFeature) {
        // this.displayedFeaures.splice(index, 1, newFeature)
        this.$set(this.displayedFeaures, index, newFeature)
      }
      this.$map.ext.refreshOverlays()
    }
  }
}
</script>

<style lang="scss" scoped>
.identification-tool {
  .menu {
    .btn {
      margin: 4px;
    }
  }
}
.info-panel {
  flex: 0 1 auto;
}
</style>
