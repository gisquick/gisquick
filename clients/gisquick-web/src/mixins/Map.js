import 'ol/ol.css'
import Extent from 'ol/extent'
import Vue from 'vue'
import { mapState, mapGetters } from 'vuex'

import { createMap, registerProjections } from '@/map/map-builder'

export default {
  computed: {
    ...mapState(['project']),
    ...mapGetters(['visibleBaseLayer', 'visibleLayers'])
  },
  watch: {
    visibleLayers: 'setVisibleLayers',
    visibleBaseLayer: 'setVisibleBaseLayer'
  },
  created () {
    const { config } = this.project
    if (config.projections) {
      registerProjections(config.projections)
    }
    const visibleBaseLayer = this.project.baseLayers.list.find(l => l.visible) || this.project.baseLayers.list[0]
    if (visibleBaseLayer) {
      this.$store.commit('visibleBaseLayer', visibleBaseLayer.name)
      this.project.baseLayers.list
        .forEach(l => {
          l.visible = l === visibleBaseLayer
        })
    }

    const mapConfig = {
      project: config.ows_project,
      baseLayers: this.project.baseLayers.list,
      overlays: this.project.overlays.list,
      extent: config.project_extent,
      projection: config.projection,
      resolutions: config.tile_resolutions,
      scales: config.scales,
      owsUrl: config.ows_url,
      legendUrl: config.legend_url,
      mapcacheUrl: config.mapcache_url
    }
    const map = createMap(mapConfig, { zoom: false, attribution: false, rotate: false })
    // this.setVisibleLayers(this.visibleLayers)

    Vue.prototype.$map = map
    if (process.env.NODE_ENV === 'development') {
      window.olmap = map
    }
  },
  mounted () {
    const map = this.$map
    map.setTarget(this.$refs.mapEl)

    // extra map functions
    map.ext = {
      visibleAreaPadding: () => {
        const { top, right, bottom, left } = this.$refs.mapViewport.getBoundingClientRect()
        return [top, window.innerWidth - right, window.innerHeight - bottom, left]
      },
      visibleAreaExtent: () => {
        const { top, right, bottom, left } = this.$refs.mapViewport.getBoundingClientRect()
        const p1 = map.getCoordinateFromPixel([left, top])
        const p2 = map.getCoordinateFromPixel([right, bottom])
        return Extent.boundingExtent([p1, p2])
      },
      zoomToFeature: (feature, options = {}) => {
        const geom = feature.getGeometry()
        if (!geom) {
          return
        }
        const resolution = map.getView().getResolution()
        let padding = options.padding || map.ext.visibleAreaPadding()
        if (geom.getType() === 'Point') {
          const center = geom.getCoordinates()
          center[0] += (-padding[3] * resolution + padding[1] * resolution) / 2
          center[1] += (-padding[2] * resolution + padding[0] * resolution) / 2
          map.getView().animate({
            center,
            duration: 450
          })
        } else {
          const extent = geom.getExtent()
          // add 5% buffer (padding)
          const buffer = (map.getSize()[0] - padding[1] - padding[3]) * 0.05 * resolution
          map.getView().fit(Extent.buffer(extent, buffer), { duration: 450, padding })
        }
      },
      refreshOverlays () {
        map.overlay.getSource().refresh()
      }
    }
    const extent = this.project.config.zoom_extent || this.project.config.project_extent
    const padding = map.ext.visibleAreaPadding()
    map.getView().fit(extent, { padding })
  },
  methods: {
    setVisibleBaseLayer (layer) {
      this.$map.getLayers().getArray()
        .filter(l => l.get('type') === 'baselayer')
        .forEach(l => l.setVisible(l.get('name') === layer.name))
    },
    setVisibleLayers (layers) {
      this.$map.overlay.getSource().setVisibleLayers(layers.map(l => l.name))
    }
  }
}
