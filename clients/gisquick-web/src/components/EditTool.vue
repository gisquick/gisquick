<template>
  <div>
    <identify-pointer v-if="layer && mode !== 'add'" @click="identify"/>
    <features-viewer :features="features"/>
    <portal to="main-panel">
      <div class="edit-panel light f-col" key="edit">
        <div class="scroll-area f-col">
          <div class="f-row f-align-end">
            <v-select
              class="filled f-grow mr-0"
              :placeholder="tr.SelectLayer"
              :label="tr.Layer"
              item-text="title"
              item-value="name"
              :value="layer && layer.name"
              :items="layersList"
              @input="editLayer"
            />
            <!-- <v-btn
              class="icon outlined light p-1 mb-2"
              color="#grey"
              :disabled="!layer"
              @click="newFeature"
            >
              <v-icon name="plus"/>
            </v-btn> -->
            <v-btn
              class="icon p-1 mb-2"
              :disabled="!layer"
              @click="newFeature"
            >
              <v-icon name="attribute-table-add"/>
            </v-btn>
            <!-- <v-btn
              class="icon light outlined p-1 mb-2"
              color="#888"
              :disabled="!layer"
              @click="newFeature"
            >
              <v-icon name="attribute-table-add"/>
            </v-btn> -->
          </div>

          <!-- <div class="f-row f-align-end">
            <v-select
              class="filled f-grow mr-0"
              :placeholder="tr.SelectLayer"
              :label="tr.Layer"
              item-text="title"
              item-value="name"
              :value="layer && layer.name"
              :items="layersList"
              @input="editLayer"
            />
            <v-btn
              class="icon p-1 mb-2"
              :disabled="!layer"
              @click="newFeature"
            >
              <v-icon name="attribute-table-add"/>
            </v-btn>
          </div> -->

          <!-- <div class="f-row f-align-end">
            <v-select
              class="filled f-grow mr-0"
              :placeholder="tr.SelectLayer"
              :label="tr.Layer"
              item-text="title"
              item-value="name"
              :value="layer && layer.name"
              :items="layersList"
              @input="editLayer"
            />
            <v-btn
              class="icon light outlined p-1 mb-2"
              color="#888"
              :disabled="!layer"
              @click="newFeature"
            >
              <v-icon name="attribute-table-add"/>
            </v-btn>
          </div> -->

        </div>

        <!-- end of scroll area  -->
        <!-- <transition name="fade">
          <div v-if="true || loading" class="status f-row-ac m-2 p-2 shadow-2">
            <v-spinner width="3" size="20"/>
          </div>
        </transition> -->

      </div>
    </portal>
    <portal to="right-panel">
      <info-panel
        v-if="mode || features"
        class="mx-1 mb-2"
        :features="features"
        :layer="layer"
        :mode.sync="mode"
        :selected="selection"
        @close="[mode = '', features = null]"
        @insert="onFeatureInsert"
        @edit="onFeatureUpdate"
        @delete="onFeatureDeleted"
      />
    </portal>
  </div>
</template>

<script>
import GeoJSON from 'ol/format/GeoJSON'
import { fromCircle } from 'ol/geom/Polygon'
import Circle from 'ol/geom/Circle'
import { unByKey } from 'ol/Observable'

import { mapState } from 'vuex'
import FeaturesViewer from '@/components/ol/FeaturesViewer.vue'
import InfoPanel from '@/components/InfoPanel.vue'
import { formatFeatures } from '@/formatters'
import { layerFeaturesQuery } from '@/map/featureinfo'


const IdentifyPointer = {
  mounted () {
    const map = this.$map
    map.getViewport().style.cursor = 'crosshair'
    const key = map.on('singleclick', evt => this.$emit('click', evt))
    this.$once('hook:beforeDestroy', () => {
      unByKey(key)
      map.getViewport().style.cursor = ''
    })
  },
  render: () => null
}

export default {
  name: 'edit-tool',
  components: { InfoPanel, IdentifyPointer, FeaturesViewer },
  data () {
    return {
      mode: '',
      layer: null,
      features: null
    }
  },
  computed: {
    ...mapState(['project']),
    tr () {
      return {
        Layer: this.$gettext('Layer'),
        SelectLayer: this.$gettext('Select layer'),
        Menu: this.$gettext('Menu')
      }
    },
    layerEditable () {
      const { permissions = {} } = this.layer
      return permissions.update || permissions.delete
    },
    layersList () {
      // return this.project.overlays.list.filter(l => l.queryable && l.visible && !l.hidden)
      return this.project.overlays.list.filter(l => l.queryable && l.permissions?.insert).map(l => ({
        title: l.title,
        name: l.name,
        // disabled: !l.visible || l.hidden
      }))
    },
    selection () {
      return this.features ? { layer: this.layer.name, featureIndex: 0 } : null
    }
  },
  methods: {
    readFeatures (data) {
      const mapProjection = this.$map.getView().getProjection().getCode()
      const parser = new GeoJSON()
      const features = parser.readFeatures(data, { featureProjection: mapProjection })
      return formatFeatures(this.project, this.layer, features)
    },
    async getFeatureById (fid) {
      const params = {
        VERSION: '1.1.0',
        SERVICE: 'WFS',
        REQUEST: 'GetFeature',
        OUTPUTFORMAT: 'GeoJSON',
        FEATUREID: fid,
      }
      const { data } = await this.$http.get(this.project.config.ows_url, { params })
      return this.readFeatures(data)[0]
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
    async identify (evt) {
      const { map, pixel, coordinate } = evt
      this.mapCoords = coordinate
      const pixelRadius = 8
      const radius = Math.abs(map.getCoordinateFromPixel([pixel[0] + pixelRadius, pixel[1]])[0] - coordinate[0])
      const geom = fromCircle(new Circle(coordinate, radius), 6)
      const mapProjection = this.$map.getView().getProjection().getCode()
      if (mapProjection != this.layer.projection) {
        geom.transform(mapProjection, l.projection)
      }
      const query = layerFeaturesQuery(this.layer, { geom })
      map.getViewport().style.cursor = 'wait'
      try {
        const features = await this.getFeaturesByWFS( query, { 'MAXFEATURES': 1 })
        this.features = Object.freeze(features)
      } finally {
        map.getViewport().style.cursor = 'crosshair'
      }
    },
    newFeature () {
      this.mode = 'add'
      this.features = null
    },
    editLayer (layername) {
      const layer = this.project.overlays.byName[layername]
      this.layer = layer
      this.$store.commit('layerVisibility', { layer, visible: true })
    },
    async onFeatureInsert (fid) {
      const added = await this.getFeatureById(fid)
      this.features = Object.freeze([added])
      this.$map.ext.refreshOverlays()
      this.mode = 'edit'
    },
    async onFeatureUpdate (f) {
      this.$emit('edit', f) // or return 'added' feature?
      const added = await this.getFeatureById(f.getId())
      this.features = Object.freeze([added])
      this.$map.ext.refreshOverlays()
    },
    onFeatureDeleted () {
      this.features = null
      this.$map.ext.refreshOverlays()
    }
  }
}
</script>

<style lang="scss" scoped>
.edit-panel {
  display: grid;
  grid-template-rows: 1fr auto;
  // height: calc(100vh - 44px);
  // max-height: calc(var(--vh, 1vh) * 100 - 44px);
  overflow: hidden;
  font-size: 15px;
  .scroll-area {
    overflow: auto;
    min-height: 0;
    grid-area: 1 / 1 / 2 / 2;
    z-index: 1;
  }
  // .status {
  //   grid-area: 1 / 1 / 2 / 2;
  //   align-self: start;
  //   justify-self: center;
  //   z-index: 2;
  //   border-radius: 50%;
  //   background-color: #fff;
  // }
  .label {
    font-size: 11.5px;
    text-transform: uppercase;
    font-weight: 500;
    opacity: 0.75;
    margin: 0 6px;
  }
}
// .data-label {
//   font-size: 9.5px;
//   font-weight: bold;
//   letter-spacing: 1px;
//   text-transform: uppercase;
//   text-align: center;
//   background-color: #444;
//   color: #fff;
// }
.window {
  overflow: hidden;
  border-radius: 3px;
  border: 1px solid #aaa;
  background-color: #fff;
  position: relative;
  @media (max-width: 500px) {
    width: calc(100vw - 26px);
    max-width: calc(100vw - 26px);
  }
  @media (min-width: 501px) {
    width: 400px;
  }
  .toolbar {
    background-color: #e0e0e0;
    border-top: 1px solid #bbb;
  }
}
</style>