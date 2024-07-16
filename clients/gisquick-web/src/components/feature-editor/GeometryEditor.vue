<template>
  <div class="f-row">
    <!-- Mobile Map Toolbar UI -->
    <portal v-if="geomToolbar" :to="geomToolbar" xdisabled>
      <div class="geom-toolbar f-row-ac light shadow-2">
        <v-btn class="icon flat" :disabled="!geomFeatures.length" @click="zoomTo">
          <v-icon name="zoom-to"/>
        </v-btn>
        <v-btn
          v-if="isMultiPart"
          class="icon flat"
          :color="drawingEnabled ? 'primary' : ''"
          @click="drawingEnabled = !drawingEnabled"
        >
          <v-tooltip slot="tooltip">
            <translate>Add geometry</translate>
          </v-tooltip>
          <v-icon name="add-geometry"/>
        </v-btn>
        <v-btn
          class="icon"
          :disabled="!selectedNodes.length && !selected.length"
          @click="deleteSelected"
        >
          <v-icon color="red" :name="selectedNodes.length ? 'delete-node' : 'delete-geometry'"/>
          <v-tooltip slot="tooltip">
            <span v-text="selectedNodes.length ? tr.DeleteNodes : tr.DeleteGeometry"/>
          </v-tooltip>
        </v-btn>
        <v-btn
          class="icon"
          :disabled="!history.length"
          @click="undo"
        >
          <v-icon name="undo"/>
          <v-tooltip slot="tooltip">
            <translate>Undo</translate>
          </v-tooltip>
        </v-btn>
      </div>
    </portal>
    <!-- Toolbar UI -->
    <template v-if="!geomToolbar">
      <v-btn
        v-if="isMultiPart"
        class="icon flat"
        :color="drawingEnabled ? 'primary' : ''"
        @click="drawingEnabled = !drawingEnabled"
      >
        <v-tooltip slot="tooltip">
          <translate>Add geometry</translate>
        </v-tooltip>
        <v-icon name="add-geometry"/>
      </v-btn>
      <v-btn
        class="icon"
        :disabled="!selectedNodes.length && !selected.length"
        @click="deleteSelected"
      >
        <v-icon color="red" :name="selectedNodes.length ? 'delete-node' : 'delete-geometry'"/>
        <v-tooltip slot="tooltip">
          <span v-text="selectedNodes.length ? tr.DeleteNodes : tr.DeleteGeometry"/>
        </v-tooltip>
      </v-btn>
      <v-btn
        class="icon"
        :disabled="!history.length"
        @click="undo"
      >
        <v-icon name="undo"/>
        <v-tooltip slot="tooltip">
          <translate>Undo</translate>
        </v-tooltip>
      </v-btn>
    </template>

    <!-- OpenLayers -->
    <vector-layer
      :ol-style="geomStyle"
      :features="geomFeatures"
      :layer.sync="layers.geometry"
      overlay
    />
    <draw-interaction
      v-if="drawingActive"
      :type="drawGeomType"
      :layout="geometryLayout"
      :ol-style="editStyle"
      @drawend="onDrawEnd"
    />
    <translate-interaction
      v-if="!nodeFeature"
      key="translate-handler1"
      :features="selected"
      @translatestart="saveState"
      @translateend="geomModified = true"
    />
    <!-- Selection of geometry parts -->
    <select-interaction
      v-if="layers.geometry"
      :active="!nodeFeature && !drawingEnabled"
      :layers="layers.geometry"
      :selection.sync="selected"
      :ol-style="editMoveStyle"
      @keydown.delete="!nodeFeature && deleteSelectedFeatures()"
    />
    <!-- Moving points without selection -->
    <!-- <modify-interaction
      v-if="selected.length && !drawingEnabled && !nodeFeature"
      :features="selected"
      :ol-style="editStyle"
      @modifystart="saveState"
      @modifyend="geomModified = true"
    /> -->

    <!-- Nodes Tool -->
    <template v-if="nodesFeatures">
      <vector-layer
        key="nodes-layer"
        :ol-style="nodesStyle"
        :features="nodesFeatures"
        :layer.sync="layers.nodes"
        overlay
      />
      <select-interaction
        v-if="layers.nodes"
        key="nodes-select"
        :layers="layers.nodes"
        :selection.sync="selectedNodes"
        :ol-style="editMoveStyle"
        @keydown.delete="deleteSelected"
      />
      <modify-interaction
        key="nodes-modify"
        :features="nodesModifyFeatures"
        :ol-style="editStyle"
        @modifystart="nodeModifyStart"
        @modifyend="nodeModifyEnd"
      />
      <translate-interaction
        v-if="selectedNodes.length"
        key="translate-handler"
        :features="selectedNodes"
        @translatestart="saveState"
        @translating="handleNodesTranslate"
      />
    </template>

    <!-- Popups -->
    <v-dialog :value="showConfirm" :modal="false" persistent>
      <div class="confirm-dialog p-2 f-col">
        <div class="header px-4">
          <span v-text="confirmMessage"/>
        </div>
        <div class="f-row-ac">
          <v-btn class="small round f-grow" color="#777" @click="resolveConfirm(false)">
            <translate>No</translate>
          </v-btn>
          <v-btn autofocus class="small round f-grow" color="red" @click="resolveConfirm(true)">
            <translate>Yes</translate>
          </v-btn>
        </div>
      </div>
    </v-dialog>
    <v-notification ref="notification"/>
  </div>
</template>

<script>
import Feature from 'ol/Feature'
import Point from 'ol/geom/Point'
import MultiPoint from 'ol/geom/MultiPoint'
import MultiPolygon from 'ol/geom/MultiPolygon'
import MultiLineString from 'ol/geom/MultiLineString'
import Icon from 'ol/style/Icon'
import { Style } from 'ol/style'
import last from 'lodash/last'

import VNotification from '@/ui/Notification.vue'
import VectorLayer from '@/components/ol/VectorLayer.vue'
import SelectInteraction from '@/components/ol/SelectInteraction.vue'
import DrawInteraction from '@/components/ol/DrawInteraction.vue'
import ModifyInteraction from '@/components/ol/ModifyInteraction.vue'
import TranslateInteraction from '@/components/ol/TranslateInteraction.vue'
import { simpleStyle, highlightedStyle } from '@/map/styles'
import { ShallowObj, ShallowArray } from '@/utils'
import MoveIcon from '@/assets/gis-move.svg?raw'

const MultiGeomClasses = {
  Point: MultiPoint,
  Polygon: MultiPolygon,
  LineString: MultiLineString
}

function LineStringNodesHandler (geom) {
  const points = geom.getCoordinates()
  const nodes = points.map((p, pi) => new Feature({ geometry: new Point(p), index: pi }))
  return {
    nodes,
    isValid () {
      return this.nodes.length === geom.flatCoordinates.length / geom.stride
    },
    deleteNodes (removeNodes) {
      const points = geom.getCoordinates()
      const indexes = removeNodes.map(f => f.get('index')).sort()
      indexes.forEach((index, iter) => points.splice(index - iter, 1))
      geom.setCoordinates(points)
      this.nodes = this.nodes.filter(f => !removeNodes.includes(f))
      this.nodes.forEach((f, i) => f.set('index', i))
    }
  }
}

function PolygonNodesHandler (geom) {
  const ringsMap = {}
  const nodes = []
  geom.getCoordinates().forEach((ringCoords, ri) => {
    const rNodes = ringCoords.map((p, pi) => new Feature({ geometry: new Point(p), ring: ri, index: pi }))
    rNodes.pop() // last point is the same as first one, so we don't need node for it
    ringsMap[ri] = rNodes
    nodes.push(...rNodes)
  })
  return {
    nodes,
    isValid () {
      return this.nodes.length === (geom.flatCoordinates.length / geom.stride) - geom.getLinearRingCount()
    },
    deleteNodes (removeNodes) {
      const newNodes = []
      const coords = geom.getCoordinates()
      geom.getLinearRings().forEach((ring, ri) => {
        const ringRemoveNodes = removeNodes.filter(n => n.get('ring') === ri)
        const indexes = ringRemoveNodes.map(f => f.get('index')).sort()
        indexes.forEach((index, iter) => coords[ri].splice(index - iter, 1))
        ringsMap[ri] = ringsMap[ri].filter(f => !ringRemoveNodes.includes(f))
        ringsMap[ri].forEach((f, i) => f.set('index', i))
        newNodes.push(...ringsMap[ri])
        // when first point was deleted, update last coord to the new first point
        if (indexes[0] === 0) {
          coords[ri].pop()
          coords[ri].push(coords[ri][0])
        }
      })
      geom.setCoordinates(coords)
      this.nodes = newNodes
    }
  }
}

function NodesHandler (feature) {
  const geom = feature.getGeometry()
  switch (geom.getType()) {
    case 'LineString':
      return LineStringNodesHandler(geom)
    case 'Polygon':
      return PolygonNodesHandler(geom)
    default:
      throw Error(`Not supported geometry type: ${geom.getType()}`)
  }
}

const icon = new Icon({
  src: MoveIcon,
  // src: 'data:image/svg+xml;utf8,' + escape(svg),
  opacity: 0.9
})

export default {
  components: { VNotification, VectorLayer, SelectInteraction, DrawInteraction, ModifyInteraction, TranslateInteraction },
  props: {
    feature: Object,
    geometryType: String,
    geomToolbar: String,
    deleteConfirmation: Boolean,
    /* output props */
    // Used because $refs doesn't work nicely in all cases with Portal Vue and hot reload
    editor: Object
  },
  data () {
    return {
      drawingEnabled: false,
      nodeToolEnabled: true,
      geomFeatures: ShallowArray(),
      selected: ShallowArray(),
      nodesFeatures: null,
      selectedNodes: ShallowArray(),
      geomModified: false,
      layers: ShallowObj({
        geometry: null,
        nodes: null
      }),
      history: [],
      showConfirm: false,
      confirmMessage: ''
    }
  },
  computed: {
    isMobileDevice () {
      return window.env.mobile
    },
    geomType () {
      return this.geometryType || this.feature.getGeometry().getType()
    },
    isMultiPart () {
      return this.geomType.startsWith('Multi')
    },
    drawGeomType () {
      const t = this.geomType.replace('Multi', '')
      return t.endsWith('Z') ? t.slice(0, -1) : t
    },
    geometryLayout () {
      return this.geomType.endsWith('Z') ? 'XYZ' : 'XY'
    },
    drawingActive () {
      return this.drawingEnabled || (!this.isMultiPart && this.geomFeatures.length === 0)
    },
    geomStyle () {
      return simpleStyle({
        // fill: '#9FA8DAc0',
        // stroke: '#3F51B5d0'
        // fill: '#EF9A9Ab0',
        // stroke: '#880E4Ff0',
        fill: '#FFAB91a0',
        stroke: '#E64A19ff',
        strokeWidth: 3
      })
    },
    translateStyle () {
      const _this = this
      const nodesStyle = new Style({
        image: icon,
        geometry (feature) {
          const geom = feature.getGeometry()
          if (feature === (_this.nodeToolActive ? last(_this.selectedNodes) : last(_this.selected))) {
          // if (feature === (_this.nodeToolActive ? _this.selectedNodes[0] : _this.selected[0])) {
            const point = geom.clone()
            const offset = _this.$map.getView().getResolution() * 50
            point.translate(0, -offset)
            return point
          }
          return null
        },
        zIndex: 100
      })
      return nodesStyle
    },
    editStyle () {
      return highlightedStyle('#E64A19ff')
    },
    editMoveStyle () {
      return this.isMobileDevice ? [...this.editStyle, this.translateStyle] : this.editStyle
    },
    nodesStyle () {
      return simpleStyle({
        fill: '#55aaaaff',
        stroke: '#ffffffc9',
        strokeWidth: 1,
        radius: 4
      })
    },
    nodeToolDisabled () {
      return this.drawGeomType === 'Point' || this.selected.length !== 1 || this.drawingEnabled
    },
    nodeToolActive () {
      return this.nodeToolEnabled && !this.nodeToolDisabled
    },
    nodeFeature () {
      return (this.nodeToolActive && this.selected[0]) || null
    },
    nodesModifyFeatures () {
      return this.selected.concat(this.nodesFeatures)
    },
    tr () {
      return {
        DeleteNodes: this.$gettext('Delete selected nodes'),
        DeleteGeometry: this.$gettext('Delete selected geometry')
      }
    }
  },
  mounted () {
    const editor = {
      getGeometry: () => {
        return this.getGeometry()
      }
    }
    const setReference = ref => {
      if (this.editor !== ref) {
        this.$emit('update:editor', ref)
      }
    }
    setReference(editor)
    this.$watch('editor', value => setReference(editor))
    this.$once('hook:beforeDestroy', () => setReference(null))
    // change focus to allow immediate keydown event handler (for deleting features)
    document.body.focus()
  },
  watch: {
    feature: {
      immediate: true,
      handler (feature) {
        this.geomFeatures = ShallowArray(this.createGeomFeatures(feature))
        this.geomModified = false
        // if (!this.isMultiPart && this.geomFeatures?.length === 1) {
        if (this.geomFeatures?.length === 1) {
          this.selected = ShallowArray(this.geomFeatures)
        } else {
          this.selected = ShallowArray()
        }
        this.history = ShallowArray()
      }
    },
    nodeFeature: {
      immediate: true,
      handler (feature) {
        if (feature) {
          this.nodesHandler = NodesHandler(feature)
          this.nodesFeatures = ShallowArray(this.nodesHandler.nodes)
        } else {
          this.nodesHandler = null
          this.nodesFeatures = null
        }
        this.selectedNodes = ShallowArray()
      }
    },
    geometryType () {
      this.geomFeatures = ShallowArray()
      this.selected = ShallowArray()
      this.geomModified = false
    }
  },
  methods: {
    showNotification (msg) {
      return this.$refs.notification.showSuccess(msg, { color: 'dark' })
    },
    confirmCallback (msg) {
      this.showConfirm = true
      this.confirmMessage = msg
      return new Promise(resolve => {
        this._resolveConfirmDialog = resolve
      })
    },
    resolveConfirm (value) {
      this.showConfirm = false
      this._resolveConfirmDialog(value)
    },
    zoomTo () {
      this.$map.ext.zoomToGeometry(this.geomModified ? this.getGeometry() : this.feature.getGeometry())
    },
    createGeomFeatures (feature) {
      if (!feature || !feature.getGeometry()) {
        return []
      }
      const geom = feature.getGeometry().clone()
      const type = geom.getType()
      if (type.startsWith('Multi')) {
        const decomposeFn = type.replace('Multi', 'get') + 's'
        return geom[decomposeFn]().map(g => new Feature({ geometry: g }))
      }
      return [new Feature({ geometry: geom })]
    },
    onDrawEnd (e) {
      this.saveState()
      if (this.isMultiPart) {
        this.geomFeatures.push(e.feature)
        this.selected = ShallowArray([e.feature])
      } else {
        this.geomFeatures = ShallowArray([e.feature])
        this.selected = this.geomFeatures
      }
      this.geomModified = true
    },
    getGeometry () {
      if (this.isMultiPart) {
        if (this.geomFeatures.length === 0) {
          return null
        }
        const GeomClass = MultiGeomClasses[this.drawGeomType]
        const geom = new GeomClass([], this.geometryLayout) // note: layout seems to be ignored without coordinates
        geom.setLayout(this.geometryLayout)
        const composeFn = 'append' + this.drawGeomType
        this.geomFeatures.forEach(f => {
          geom[composeFn](f.getGeometry())
        })
        return geom
      }
      const f = this.geomFeatures[0]
      return f?.getGeometry() ?? null
    },
    async deleteSelectedFeatures () {
      if (this.deleteConfirmation) {
        const confirmed = await this.confirmCallback(this.tr.DeleteGeometry + '?')
        if (confirmed) {
          this._deleteSelectedFeatures()
        }
      } else {
        this._deleteSelectedFeatures()
        this.showNotification?.(this.$gettext('Selected geometry was deleted'), { color: 'primary' })
      }
    },
    _deleteSelectedFeatures () {
      this.saveState()
      this.geomFeatures = ShallowArray(this.geomFeatures.filter(f => !this.selected.includes(f)))
      this.selected = ShallowArray()
      this.geomModified = true
    },
    deleteSelectedNodes () {
      this.saveState()
      this.nodesHandler.deleteNodes(this.selectedNodes)
      this.nodesFeatures = ShallowArray(this.nodesHandler.nodes)
      this.selectedNodes = ShallowArray()
      this.geomModified = true
    },
    deleteSelected () {
      this.selectedNodes.length > 0 ? this.deleteSelectedNodes() : this.deleteSelectedFeatures()
    },
    nodeModifyStart (e) {
      this.saveState()
      this.selectedNodes = ShallowArray()
    },
    nodeModifyEnd (e) {
      if (!this.nodesHandler.isValid()) {
        this.nodesHandler = NodesHandler(this.nodeFeature)
        this.nodesFeatures = ShallowArray(this.nodesHandler.nodes)
      }
      let modifyNode = e.features.getArray().find(f => f.getGeometry().getType() === 'Point')
      if (!modifyNode || !this.nodesFeatures.includes(modifyNode)) {
        const equalCoords = (c1, c2) => c1[0] === c2[0] && c1[1] === c2[1]
        modifyNode = this.nodesFeatures.find(f => equalCoords(f.getGeometry().getCoordinates(), e.mapBrowserEvent.coordinate))
      }
      if (modifyNode) {
        this.selectedNodes = ShallowArray([modifyNode])
      }
      this.geomModified = true
    },
    handleNodesTranslate (e) {
      const g = this.selected[0]?.getGeometry()
      if (g) {
        const coords = g.getCoordinates()
        if (g.getType() === 'LineString') {
          e.features.forEach(f => {
            const index = f.get('index')
            coords[index] = f.getGeometry().getCoordinates()
          })
        } else if (g.getType() === 'Polygon') {
          e.features.forEach(f => {
            const ring = f.get('ring')
            const index = f.get('index')
            coords[ring][index] = f.getGeometry().getCoordinates()
            if (index === 0) {
              coords[ring][coords[ring].length - 1] = coords[ring][0]
            }
          })
        }
        g.setCoordinates(coords)
        this.geomModified = true
      }
    },
    saveState () {
      this.history.push({
        geoms: this.geomFeatures.map(f => f.getGeometry().clone()),
        selected: this.geomFeatures.indexOf(this.selected[0])
      })
    },
    undo () {
      if (this.history.length > 0) {
        const { geoms, selected } = this.history.pop()
        if (geoms) {
          if (geoms.length === this.geomFeatures.length) {
            this.geomFeatures.forEach((f, i) => f.setGeometry(geoms[i]))
          } else {
            if (geoms.length) {
              this.geomFeatures = ShallowArray(geoms.map(g => new Feature({ geometry: g })))
              if (this.drawGeomType !== 'Point') {
                const f = new Feature({ geometry: this.getGeometry() })
                this.nodesHandler = NodesHandler(f)
                this.nodesFeatures = ShallowArray(this.nodesHandler.nodes)
              }
            } else {
              this.geomFeatures = ShallowArray()
              this.nodesHandler = null
              this.nodesFeatures = ShallowArray()
            }
          }
          this.selected = selected !== -1 ? ShallowArray([this.geomFeatures[selected]]) : ShallowArray()
          this.selectedNodes = ShallowArray()
        }
      }
    }
  }
}
</script>

<style lang="scss" scoped>
.map-toolbar {
  margin: 6px;
  border-radius: 4px;
  background-color: #333;
}
.geom-toolbar {
  background-color: #eee;
  margin: 4px;
  border-radius: 3px;
  --gutter: 0 3px;
  .btn {
    height: 26px;
    width: 26px;
  }
}
.confirm-dialog {
  .header {
    font-weight: 500;
  }
}
</style>
