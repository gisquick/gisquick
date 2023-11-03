<template>
  <div class="f-row">
    <!-- Toolbar UI -->
    <v-btn
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
      v-if="drawGeomType !== 'Point'"
      :disabled="nodeToolDisabled"
      class="icon flat"
      :color="nodeToolEnabled ? 'primary' : ''"
      @click="nodeToolEnabled = !nodeToolEnabled"
    >
      <v-tooltip slot="tooltip">
        <translate>Node tool</translate>
      </v-tooltip>
      <v-icon name="node-tool"/>
    </v-btn>

    <!-- OpenLayers -->
    <vector-layer
      :ol-style="geomStyle"
      :features="geomFeatures"
      :layer.sync="layers.geometry"
    />
    <draw-interaction
      v-if="drawingEnabled"
      :type="drawGeomType"
      :ol-style="editStyle"
      @drawend="onDrawEnd"
    />
    <!-- Selection of geometry parts -->
    <select-interaction
      v-if="layers.geometry"
      :active="!nodeFeature && !drawingEnabled"
      :layers="layers.geometry"
      :selection.sync="selected"
      :ol-style="editStyle"
      @keydown.delete="!nodeFeature && deleteSelectedFeatures()"
    />
    <modify-interaction
      v-if="selected.length && !drawingEnabled && !nodeFeature"
      :features="selected"
      :ol-style="editStyle"
      @modifyend="geomModified = true"
    />
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
        :ol-style="editStyle"
        @keydown.delete="deleteSelectedNodes"
      />
      <modify-interaction
        v-if="selectedNodes.length < 2"
        key="nodes-modify"
        :features="nodesModifyFeatures"
        :ol-style="editStyle"
        @modifyend="nodeModifyEnd"
      />
    </template>
  </div>
</template>

<script lang="js">
import Feature from 'ol/Feature'
import Point from 'ol/geom/Point'
import MultiPoint from 'ol/geom/MultiPoint'
import MultiPolygon from 'ol/geom/MultiPolygon'
import MultiLineString from 'ol/geom/MultiLineString'

import VectorLayer from '@/components/ol/VectorLayer.vue'
import SelectInteraction from '@/components/ol/SelectInteraction.vue'
import DrawInteraction from '@/components/ol/DrawInteraction.vue'
import ModifyInteraction from '@/components/ol/ModifyInteraction.vue'
import { simpleStyle, highlightedStyle } from '@/map/styles'
import { ShallowObj, ShallowArray } from '@/utils'


const MultiGeomClasses = {
  MultiPoint,
  MultiPolygon,
  MultiLineString
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

export default {
  components: { VectorLayer, SelectInteraction, DrawInteraction, ModifyInteraction },
  props: {
    feature: Object,
    geometryType: String,
    /* output props */
    // Used because $refs doesn't work nicely in all cases with Portal Vue and hot reload
    editor: Object
  },
  data () {
    return {
      drawingEnabled: false,
      nodeToolEnabled: false,
      geomFeatures: ShallowArray(),
      selected: ShallowArray(),
      nodesFeatures: null,
      selectedNodes: ShallowArray(),
      geomModified: false,
      layers: ShallowObj({
        geometry: null,
        nodes: null
      })
    }
  },
  computed: {
    geomType () {
      return this.geometryType || this.feature.getGeometry().getType()
    },
    isMultiPart () {
      return this.geomType.startsWith('Multi')
    },
    drawGeomType () {
      return this.geomType.replace('Multi', '')
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
    editStyle () {
      return highlightedStyle('#E64A19ff')
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
    nodeFeature () {
      return this.nodeToolEnabled && !this.nodeToolDisabled && this.selected[0]
    },
    nodesModifyFeatures () {
      return this.selected.concat(this.nodesFeatures)
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
  },
  watch: {
    feature: {
      immediate: true,
      handler (feature) {
        this.geomFeatures = ShallowArray(this.createGeomFeatures(feature))
        this.selected = ShallowArray()
        this.geomModified = false
      }
    },
    nodeFeature: {
      immediate: true,
      handler (feature) {
        if (feature) {
          this.nodesHandler = NodesHandler(feature)
          this.nodesFeatures = ShallowArray(this.nodesHandler.nodes)
        } else {
          this.nodesFeatures = null
        }
        this.selectedNodes = ShallowArray()
      }
    }
  },
  methods: {
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
        const GeomClass = MultiGeomClasses[this.geomType]
        const geom = new GeomClass([])
        const composeFn = 'append' + this.drawGeomType
        this.geomFeatures.forEach(f => {
          geom[composeFn](f.getGeometry())
        })
        return geom
      }
      const f = this.geomFeatures[0]
      return f?.getGeometry() ?? null
    },
    deleteSelectedFeatures () {
      this.geomFeatures = ShallowArray(this.geomFeatures.filter(f => !this.selected.includes(f)))
      this.selected = ShallowArray()
      this.geomModified = true
    },
    deleteSelectedNodes () {
      this.nodesHandler.deleteNodes(this.selectedNodes)
      this.nodesFeatures = ShallowArray(this.nodesHandler.nodes)
      this.selectedNodes = ShallowArray()
      this.geomModified = true
    },
    nodeModifyEnd (e) {
      if (!this.nodesHandler.isValid()) {
        this.nodesHandler = NodesHandler(this.nodeFeature)
        this.nodesFeatures = ShallowArray(this.nodesHandler.nodes)
      }
      this.geomModified = true
    }
  }
}
</script>
