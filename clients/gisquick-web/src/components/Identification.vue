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
    <point-marker
      :coords="mapCoords"
      :error="!!tasks.fetchFeatures.error"
      :loading="tasks.fetchFeatures.pending"
    />

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
import partition from 'lodash/partition'
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
import { layersFeaturesQuery } from '@/map/featureinfo'
import { ShallowArray } from '@/utils'
import { formatFeatures } from '@/formatters'
import { TaskState, watchTask } from '@/tasks'

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
      tasks: {
        fetchFeatures: TaskState()
      }
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
    readFeatures (data) {
      const parser = new GeoJSON()
      return parser.readFeatures(data, { featureProjection: this.mapProjection })
    },
    async getFeaturesByWFS (query, params = {}) {
      const config = {
        params: {
          VERSION: '1.1.0',
          SERVICE: 'WFS',
          REQUEST: 'GetFeature',
          OUTPUTFORMAT: 'GeoJSON',
          ...params
        },
        headers: { 'Content-Type': 'text/xml' }
      }
      const { data } = await this.$http.post(this.project.config.ows_url, query, config)
      return this.readFeatures(data)
    },
    async getFeatureInfo (evt, layers) {
      const { map, coordinate } = evt
      const r = map.getView().getResolution()
      const s = map.overlay.getSource()
      const layersParam = layers.map(l => l.name).join(',')
      const params = {
        INFO_FORMAT: 'application/json', // 'application/vnd.ogc.gml'
        LAYERS: layersParam,
        QUERY_LAYERS: layersParam,
        FEATURE_COUNT: layers.length
      }
      const projCode = map.getView().getProjection().getCode()
      const url = s.getGetFeatureInfoUrl(coordinate, r, projCode, params)
      // const qParams = new URLSearchParams(u.split('?', 2)[1])
      // this.$http.get(url)
      // this.$http.get(this.project.config.ows_url, { params: qParams })
      const { data } = await this.$http.get(url)
      return this.readFeatures(data)

    },
    async onClick (evt) {
      const { map, pixel, coordinate } = evt
      this.mapCoords = coordinate

      const layers = this.identificationLayer
        ? this.queryableLayers.filter(l => l.name === this.identificationLayer)
        : this.queryableLayers

      const [wfsLayers, fiLayers] = partition(layers, l => l.attributes)
      const tasks = []
      if (fiLayers.length) {
        tasks.push(this.getFeatureInfo(evt, fiLayers))
      }
      if (wfsLayers.length) {
        const pixelRadius = 8
        const radius = Math.abs(map.getCoordinateFromPixel([pixel[0] + pixelRadius, pixel[1]])[0] - coordinate[0])
        const geom = {
          geom: Polygon.fromCircle(new Circle(coordinate, radius), 6),
          projection: this.mapProjection
        }
        const query = layersFeaturesQuery(wfsLayers, geom)
        tasks.push(this.getFeaturesByWFS(query, { 'MAXFEATURES': 10 }))
      }
      const task = Promise.allSettled(tasks)
      const res = await watchTask(task, this.tasks.fetchFeatures)
      this.tasks.fetchFeatures.error = res.some(i => i.status === 'rejected')
      const features = [].concat(...res.filter(i => i.value).map(i => i.value))
      const categorizedFeatures = this.categorize(features)
      const items = this.tableData(categorizedFeatures)
      this.layersFeatures = items
      if (items.length) {
        const selectedLayer = this.selection?.layer
        const index = selectedLayer ? Math.max(0, items.findIndex(i => i.layer.name === selectedLayer)) : 0
        this.selection = {
          layer: items[index].layer.name,
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
            const layer = WfsToLayerName[fid.substring(0, fid.lastIndexOf('.'))] ?? fid
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

      const params = {
        VERSION: '1.1.0',
        SERVICE: 'WFS',
        REQUEST: 'GetFeature',
        OUTPUTFORMAT: 'GeoJSON',
        FEATUREID: feature.getId()
      }
      const task = this.$http.get(this.project.config.ows_url, { params })
      const resp = await watchTask(task, this.tasks.fetchFeatures)
      if (this.tasks.fetchFeatures.success) {
        const features = this.readFeatures(resp.data)
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
