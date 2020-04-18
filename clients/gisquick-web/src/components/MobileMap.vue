<template>
  <div class="map-container">
    <div ref="mapEl" class="map"/>

    <div ref="mapViewport" class="visible-container">
      <scale-line/>
      <map-attributions class="map-attributions"/>
      <map-control/>
    </div>
    <portal-target name="map-overlay" class="map-overlay"/>

    <v-layout class="right-container column">
      <portal-target
        name="right-panel"
        class="right-panel"
        transition="slide-top-transition"
      />
      <v-spacer/>
    </v-layout>

    <swipe-container class="main-panel">
      <v-layout class="panel-content column">
        <v-divider/>
        <v-layout class="shrink toolbar grey darken-4">
          <v-btn
            v-for="tool in toolsMenuItems"
            :key="tool.name"
            @click="$store.commit('activeTool', tool.name)"
            dark
            icon
          >
            <icon :class="{'primary--text': activeTool === tool.name}" :name="tool.icon"/>
          </v-btn>
          <v-spacer/>
          <v-menu
            bottom left
            class="app-menu"
          >
            <v-btn slot="activator" dark icon>
              <v-icon>menu</v-icon>
            </v-btn>
            <app-menu/>
          </v-menu>
        </v-layout>
        <v-divider/>
        <portal-target name="main-panel-top" class="main-panel-portal"/>
        <content-panel/>
      </v-layout>
    </swipe-container>

    <map-tools ref="tools"/>
  </div>
</template>

<script>
import Vue from 'vue'
import { mapState, mapGetters } from 'vuex'
import Extent from 'ol/extent'
import 'ol/ol.css'

import { createMap } from '@/map/map-builder'
import ContentPanel from '@/components/content-panel/ContentPanel.vue'
import MapAttributions from '@/components/MapAttributions.vue'
import MapControl from '@/components/MapControl.vue'
import ScaleLine from '@/components/ol/ScaleLine.vue'
import MapTools from '@/components/MapTools.vue'
import AppMenu from '@/components/AppMenu.vue'
import SwipeContainer from '@/components/SwipeContainer.vue'

export default {
  name: 'Map',
  components: { AppMenu, ContentPanel, ScaleLine, MapAttributions, MapControl, MapTools, SwipeContainer },
  refs: ['tools'],
  data () {
    return {
      panelVisible: true,
      statusBarVisible: true
    }
  },
  computed: {
    ...mapState(['user', 'project', 'activeTool']),
    ...mapGetters(['visibleBaseLayer', 'visibleLayers']),
    toolsMenuItems () {
      const tools = (this.$refs.tools && this.$refs.tools.items) || []
      return tools.filter(t => !t.disabled && t.icon)
    }
  },
  watch: {
    visibleLayers: 'setVisibleLayers',
    visibleBaseLayer: 'setVisibleBaseLayer'
  },
  created () {
    const mapConfig = {
      project: this.project.config.ows_project,
      baseLayers: this.project.baseLayers.list,
      overlays: this.project.overlays.list,
      extent: this.project.config.project_extent,
      projection: this.project.config.projection,
      resolutions: this.project.config.tile_resolutions,
      scales: this.project.config.scales,
      owsUrl: this.project.config.ows_url,
      legendUrl: this.project.config.legend_url,
      mapcacheUrl: this.project.config.mapcache_url
    }
    const map = createMap(mapConfig, { zoom: false, attribution: false })
    // this.setVisibleLayers(this.visibleLayers)

    this.$root.$panel = {
      setStatusBarVisible: (visible) => {
        this.statusBarVisible = visible
      }
    }
    Vue.prototype.$map = map
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
      }
    }
    const extent = this.project.config.project_extent
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
</script>

<style lang="scss" scoped>
.map-overlay {
  pointer-events: none;
}

.map-container {
  width: 100%;
  height: 100vh;
  position: relative;
  display: grid;
  grid-template-columns: 1fr auto;
  grid-template-rows: minmax(auto, 75vh) 1fr;
  > * {
    position: relative;
  }
  .map {
    grid-column: 1 / 3;
    grid-row: 1 / 3;
    z-index: 0;
    min-width: 0;
    min-height: 0;
  }
  .right-container {
    grid-column: 1 / 2;
    grid-row: 1 / 2;
    justify-content: flex-end;
    align-items: flex-end;
    // justify-items: center;
    min-height: 0;
    max-height: 100%;
    margin: 0.5em;
    pointer-events: none;
    > * {
      pointer-events: auto;
    }
    .map-control {
      flex: 0 0;
    }
  }
  .right-panel {
    z-index: 2;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    justify-content: flex-end;
    max-width: 100%;
  }
  // visible area on mobile phones (takes into account browser's app bar state - visible or hidden by scrolling)
  .visible-container {
    position: fixed;
    left: 0;
    right: 0;
    top: 0;
    height: 100%;
    pointer-events: none;
    display: grid;
    grid-template-columns: 150px 1fr auto;
    .scale-line {
      grid-column: 1 / 2;
      align-self: end;
      justify-self: start;
    }
    .map-control {
      grid-column: 3 / 4;
      grid-row: 1 / 2;
      margin: 0.25em;
      z-index: 1;
      align-self: end;
      justify-self: end;
      pointer-events: auto;
    }
  }
  .map-attributions {
    z-index: 1;
  }
  .main-panel {
    grid-column: 1 / 2;
    grid-row: 1 / 3;
    z-index: 2;
    justify-self: start;
  }
  .map-overlay {
    grid-column: 1 / 3;
    grid-row: 1 / 3;
    min-width: 0;
    min-height: 0;
    max-height: 100%;
  }
}

.map {
  width: 100%;
  height: 100%;
  background-color: #fff;
}

.main-panel {
  .panel-content {
    width: 288px;
    background-color: #fff;
    border-right: 1px solid #aaa;
    box-shadow:
      0 6px 6px -3px rgba(0,0,0,.2),
      0 10px 14px 1px rgba(0,0,0,.14),
      0 4px 18px 3px rgba(0,0,0,.12);

    overflow: auto;
    .content-panel {
      width: 100%;
      flex: 1 1;
      overflow: hidden;
    }
    .toolbar {
      .icon {
        width: 24px;
        height: 24px;
      }
    }
  }
  /deep/ .v-toolbar {
    h4 {
      text-transform: uppercase;
      font-size: 90%;
    }
    .v-btn {
      height: 100%;
      margin: 0;
      min-width: 2em;
      width: 2.25em;
      position: absolute;
      right: 0;
    }
  }
}
</style>
