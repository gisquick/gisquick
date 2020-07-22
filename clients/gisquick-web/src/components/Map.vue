<template>
  <div class="map-container">
    <div ref="mapEl" class="map"/>
    <v-menu
      bottom left
      class="app-menu"
    >
      <v-btn dark fab slot="activator">
        <v-icon>more_vert</v-icon>
      </v-btn>
      <app-menu/>
    </v-menu>

    <!-- <collapse-transition class="status-bar"> -->
      <bottom-toolbar v-if="statusBarVisible" class="status-bar"/>
    <!-- </collapse-transition> -->

    <!-- <scale-line/> -->
    <div class="sticky-bottom">
      <scale-line/>
      <map-attributions class="map-attributions"/>
    </div>
    <portal-target name="map-overlay" class="map-overlay"/>
    <tools-menu :tools="toolsMenuItems"/>

    <v-btn
      dark
      color="grey darken-2"
      class="panel-toggle"
      :class="{expanded: panelVisible}"
      @click="panelVisible = !panelVisible"
    >
      <icon name="arrow-right"/>
    </v-btn>

    <v-layout class="right-container column">
      <portal-target
        name="right-panel"
        class="right-panel"
        transition="slide-top-transition"
      />
      <v-spacer/>
      <!-- <map-control/> -->
    </v-layout>
    <map-control/>

    <div ref="mapViewport" class="visible-container"/>

    <div class="bottom-container">
      <portal-target transition="collapse-transition" name="bottom-panel"/>
    </div>
    <!-- <portal-target transition="collapse-transition" name="bottom-panel" class="bottom-container"/> -->

    <transition name="collapse-width">
      <div
        v-show="panelVisible"
        class="main-panel"
      >
        <v-layout column>
          <portal-target name="main-panel-top"/>
          <content-panel/>
        </v-layout>
      </div>
    </transition>
    <map-tools ref="tools"/>
  </div>
</template>

<script>
import Vue from 'vue'
import { mapState, mapGetters } from 'vuex'
import Extent from 'ol/extent'
import 'ol/ol.css'

import { createMap, registerProjections } from '@/map/map-builder'
import ContentPanel from '@/components/content-panel/ContentPanel.vue'
import BottomToolbar from '@/components/BottomToolbar.vue'
import MapAttributions from '@/components/MapAttributions.vue'
import ToolsMenu from '@/components/ToolsMenu.vue'
import MapControl from '@/components/MapControl.vue'
import ScaleLine from '@/components/ol/ScaleLine.vue'
import MapTools from '@/components/MapTools.vue'
import AppMenu from '@/components/AppMenu.vue'

export default {
  name: 'Map',
  components: { ContentPanel, BottomToolbar, ScaleLine, MapAttributions, ToolsMenu, MapControl, MapTools, AppMenu },
  refs: ['tools'],
  data () {
    return {
      panelVisible: true,
      statusBarVisible: true
    }
  },
  computed: {
    ...mapState(['project', 'activeTool']),
    ...mapGetters(['visibleBaseLayer', 'visibleLayers']),
    toolsMenuItems () {
      const tools = (this.$refs.tools && this.$refs.tools.items) || []
      return tools.filter(t => !t.disabled)
    }
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
    const map = createMap(mapConfig, { zoom: false, attribution: false })
    // this.setVisibleLayers(this.visibleLayers)

    this.$root.$panel = {
      setStatusBarVisible: (visible) => {
        this.statusBarVisible = visible
      }
    }
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
.collapse-width-enter-active, .collapse-width-leave-active {
  transition: all .5s;
}
.collapse-width-enter, .collapse-width-leave-to {
  width: 0!important;
}
.visible-container {
  flex-grow: 1;
  pointer-events: none;
  position: relative;
  > * {
    pointer-events: auto;
  }
}
.map-overlay {
  pointer-events: none;
}

.main-panel {
  overflow: hidden;
  > div {
    align-self: flex-end;
    width: 288px;
    flex: 1 1;
    overflow: hidden;
    // > .collapsible {
    //   flex-shrink: 0;
    // }
  }
  .content-panel {
    flex: 1 1;
    overflow: hidden;
  }
}

.map-container {
  width: 100%;
  height: 100vh;
  max-height: 100vh;
  overflow: hidden;
  position: relative;
  display: grid;
  grid-template-columns: auto 1fr auto;
  grid-template-rows: 1fr minmax(0, max-content) minmax(0, min-content) minmax(0, min-content);
  > * {
    position: relative;
  }

  .map {
    grid-column: 1 / 4;
    grid-row: 1 / 5;
    z-index: 0;
    min-width: 0;
    min-height: 0;
  }
  .right-container {
    grid-column: 3 / 4;
    grid-row: 1 / 2;
    justify-content: flex-end;
    align-items: flex-end;
    // justify-items: center;
    min-height: 0;
    max-height: 100%;
    margin: 0.5em 3.25em 0 0;
    pointer-events: none;
    > * {
      pointer-events: auto;
    }
    .map-control {
      flex: 0 0;
    }
  }
  .sticky-bottom {
    grid-column: 2 / 4;
    grid-row: 3 / 4;
    position: relative;
    overflow: visible;
    > * {
      position: absolute;
      bottom: 2px;
    }
    .scale-line {
      left: 0;
    }
    .map-attributions {
      right: 2px;
      left: 10em;
    }
  }
  .map-attributions {
    z-index: 1;
  }
  .main-panel {
    grid-column: 1 / 2;
    grid-row: 1 / 5;
    z-index: 2;
  }
  .v-speed-dial {
    grid-column: 2 / 3;
    grid-row: 1 / 2;
    align-self: start;
    width: 3.5em;
    z-index: 2;
  }
  .panel-toggle {
    grid-column: 2 / 3;
    grid-row: 1 / 2;
    align-self: center;
    z-index: 1;
  }
  .map-control {
    grid-column: 3 / 4;
    grid-row: 1 / 2;
    margin: 0.25em;
    z-index: 2;

    align-self: end;
    justify-self: end;
  }
  .app-menu {
    grid-column: 3 / 4;
     grid-row: 1 / 2;
     align-self: start;
     justify-self: end;
     margin: 0.5em;
  }
  .right-panel {
    // grid-column: 3 / 4;
    // grid-row: 1 / 2;
    z-index: 2;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    justify-content: flex-end;
  }
  .visible-container {
    grid-column: 2 / 3;
    grid-row: 1 / 2;
    min-width: 0;
    min-height: 0;
    max-height: 100%;
  }
  .map-overlay {
    grid-column: 2 / 4;
    grid-row: 1 / 2;
    min-width: 0;
    min-height: 0;
    max-height: 100%;
  }
  .status-bar {
    grid-column: 1 / 4;
    grid-row: 4 / 5;
    z-index: 1;
    align-self: end;
  }
  .bottom-container {
    grid-column: 2 / 4;
    grid-row: 2 / 5;
    z-index: 2;
    min-width: 0;
    max-width: 100%;
  }
}

.map {
  width: 100%;
  height: 100%;
  background-color: #fff;
}

.main-panel {
  position: relative;
  width: 288px;
  display: flex;
  flex-direction: column;
  background-color: #fff;
  border-right: 1px solid #aaa;
  box-shadow:
    0 6px 6px -3px rgba(0,0,0,.2),
    0 10px 14px 1px rgba(0,0,0,.14),
    0 4px 18px 3px rgba(0,0,0,.12);

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

.v-btn.panel-toggle {
  margin: 0;
  width: 19px;
  min-width: 0;
  padding: 0;
  border-radius: 0;
  border-top-right-radius: 4px;
  border-bottom-right-radius: 4px;

  .icon {
    width: 16px;
    height: 16px;
  }
  &.expanded .icon {
    transform: rotateY(180deg);
  }
}

.bottom-container {
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  position: relative;
  pointer-events: none;
  .collapse-enter-active, .collapse-leave-active {
    overflow: visible!important;
  }
  /*.collapse-enter, .collapse-leave-to {
    opacity: 0!important;
  }*/
}

.app-menu {
  .v-menu__activator {
    .v-btn {
      margin: 0;
      width: 2.75em;
      height: 2.75em;
      border-radius: 20%;
      opacity: 0.8;
      .icon {
        font-size: 1.75em;
      }
    }
  }
}
</style>
