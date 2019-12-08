<template>
  <div class="map-container">
    <div ref="mapEl" class="map"/>

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

import { createMap } from '@/map/map-builder'
import ContentPanel from './content-panel/ContentPanel'
import BottomToolbar from './BottomToolbar'
import MapAttributions from './MapAttributions'
import ToolsMenu from './ToolsMenu'
import MapControl from './MapControl'
import ScaleLine from './ol/ScaleLine'
import MapTools from './MapTools'

export default {
  name: 'Map',
  components: { ContentPanel, BottomToolbar, ScaleLine, MapAttributions, ToolsMenu, MapControl, MapTools },
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
        const resolution = map.getView().getResolution()
        let padding = options.padding || map.ext.visibleAreaPadding()
        if (feature.getGeometry().getType() === 'Point') {
          const center = feature.getGeometry().getCoordinates()
          center[0] += (-padding[3] * resolution + padding[1] * resolution) / 2
          center[1] += (-padding[2] * resolution + padding[0] * resolution) / 2
          map.getView().animate({
            center,
            duration: 450
          })
        } else {
          const extent = feature.getGeometry().getExtent()
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
  height: 100%;
  position: relative;
  display: grid;
  grid-template-columns: auto 1fr minmax(0, auto);
  grid-template-rows: 1fr minmax(0, max-content) minmax(0, min-content) minmax(0, min-content);
  > * {
    position: relative;
  }

  .map {
    grid-column: 1 / 4;
    grid-row: 1 / 5;
    z-index: 0;
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
  .right-panel {
    grid-column: 3 / 4;
    grid-row: 1 / 2;
    z-index: 2;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    justify-content: flex-end;
  }
  .map-overlay, .visible-container {
    grid-column: 2 / 3;
    grid-row: 1 / 2;
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

</style>
