<template>
  <div class="map-container">
    <div ref="mapEl" class="map"/>

    <!-- <collapse-transition name="bslide"> -->
      <bottom-toolbar v-if="statusBarVisible"/>
    <!-- </collapse-transition> -->

    <v-layout
      class="column map-view"
      :style="{ left: mapView.left }"
    >
      <div ref="mapViewport" class="visible-container">
        <scale-line/>

        <map-attributions/>

        <portal-target name="map-overlay" class="map-overlay"/>

        <tools-menu :tools="tools"/>
        <v-layout class="row align-end right-container">
          <map-control/>
          <portal-target name="right-panel" class="right-panel layout"/>
        </v-layout>
        <v-btn
          dark
          color="grey darken-2"
          class="panel-toggle"
          :class="{expanded: panelVisible}"
          @click="panelVisible = !panelVisible"
        >
          <icon name="arrow-right"/>
        </v-btn>
      </div>

      <div
        class="bottom-container"
        :style="{minHeight: mapView.bottom}"
      >
        <portal-target transition="collapse-transition" name="bottom-panel"/>
      </div>
    </v-layout>

    <transition
      name="slide"
      @beforeLeave="mapView.left = '0'"
      @beforeEnter="mapView.left = '280px'"
    >
      <div
        v-show="panelVisible"
        class="main-panel"
      >
        <collapse-transition class="collapsible">
          <div v-if="activeToolObj && activeToolObj.title">
            <v-toolbar dark flat height="30">
              <v-spacer/>
              <h4>{{ activeToolObj.title }}</h4>
              <v-spacer/>
              <v-btn flat @click="$store.commit('activeTool', null)">
                <v-icon>close</v-icon>
              </v-btn>
            </v-toolbar>
            <portal-target name="main-panel" transition="switch-transition"/>
          </div>
        </collapse-transition>
        <content-panel/>
      </div>
    </transition>
    <!-- Component of active tool -->
    <div
      :is="activeToolObj && activeToolObj.component"
      @close="$store.commit('activeTool', null)"
    />
  </div>
</template>

<script>
import Vue from 'vue'
import { mapState, mapGetters } from 'vuex'
import 'ol/ol.css'

import { createMap } from '../map-builder'
import ContentPanel from './content-panel/ContentPanel'
import BottomToolbar from './BottomToolbar'
import MapAttributions from './MapAttributions'
import ToolsMenu from './ToolsMenu'
import MapControl from './MapControl'
import ScaleLine from './ol/ScaleLine'

import AttributesTable from './AttributesTable'
import Identification from './Identification'
import Measure from './measure/Measure'
import Print from './print/Print'

export default {
  name: 'Map',
  components: { ContentPanel, BottomToolbar, ScaleLine, MapAttributions, ToolsMenu, MapControl },
  data () {
    return {
      panelVisible: true,
      statusBarVisible: true,
      mapView: {
        left: '280px',
        bottom: '32px'
      }
    }
  },
  computed: {
    ...mapState(['project', 'activeTool']),
    ...mapGetters(['visibleBaseLayer', 'visibleLayers']),
    tools () {
      return [
        {
          name: 'identification',
          title: 'Identification',
          icon: 'identification',
          component: Identification
        }, {
          name: 'measure',
          title: 'Measure',
          icon: 'ruler',
          component: Measure
        }, {
          name: 'print',
          title: 'Print',
          icon: 'printer',
          component: Print,
          disabled: !this.project.config.print_composers
        }, {
          name: 'attribute-table',
          component: {
            render (h) {
              return <portal to="bottom-panel"><AttributesTable key="attribute-table" onClose={this.close}/></portal>
            },
            methods: {
              close () {
                this.$store.commit('activeTool', null)
              }
            }
          }
        }
      ].filter(t => !t.disabled)
    },
    activeToolObj () {
      return this.activeTool && this.tools.find(t => t.name === this.activeTool)
    }
  },
  watch: {
    visibleLayers: 'setVisibleLayers',
    visibleBaseLayer: 'setVisibleBaseLayer'
    // activeTool: {
    //   immediate: true,
    //   handler (activeTool) {
    //     if (!activeTool) {
    //       this.$store.commit('activeTool', 'identification')
    //     }
    //   }
    // }
  },
  created () {
    const mapConfig = {
      project: this.project.config.project,
      baselayers: this.project.baseLayers.list,
      overlays: this.project.overlays.list,
      extent: this.project.config.project_extent,
      projection: this.project.config.projection,
      resolutions: this.project.config.tile_resolutions,
      scales: this.project.config.scales,
      owsUrl: this.project.config.ows_url,
      legendUrl: this.project.config.legend_url,
      mapcacheUrl: this.project.config.mapcache_url
    }
    this.map = createMap(mapConfig, { zoom: false, attribution: false })
    // this.setVisibleLayers(this.visibleLayers)

    this.$root.$panel = {
      setStatusBarVisible: (visible) => {
        this.statusBarVisible = visible
        this.mapView.bottom = visible ? '32px' : '0'
      }
    }
    Vue.prototype.$map = this.map
  },
  mounted () {
    this.map.setTarget(this.$refs.mapEl)
  },
  methods: {
    setVisibleBaseLayer (layer) {
      this.map.getLayers().getArray()
        .filter(l => l.get('type') === 'baselayer')
        .forEach(l => l.setVisible(l.get('name') === layer.name))
    },
    setVisibleLayers (layers) {
      this.map.overlay.getSource().setVisibleLayers(layers.map(l => l.name))
    }
  }
}
</script>

<style lang="scss" scoped>

.map-view {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  transition: none.4s cubic-bezier(.25,.8,.5,1);
  transition-property: left, right;
  pointer-events: none;

  > * {
    pointer-events: auto;
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
    position: absolute;
    left: 0;
    right: 0;
    top: 0;
    bottom: 0;
    pointer-events: none;
  }
}

.main-panel > .collapsible {
  flex-shrink: 0;
}

.map-container {
  width: 100%;
  height: 100%;
  position: relative;
}
.map {
  width: 100%;
  height: 100%;
  background-color: #fff;
  .ol-zoom {
    left: auto;
    right: 0.5em;
  }

  .scale-line {
    position: absolute;
    left: 0;
    bottom: 0;
  }
}

.main-panel {
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 280px;
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
  position: absolute;
  margin: 0;
  left: 0;
  top: calc(50% - 18px);
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

.v-speed-dial {
  position: absolute;
  top: 0;
  z-index: 100;
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

.bottom-toolbar {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
}
.right-container {
  position: absolute;
  top: 3.5em;
  right: 0.5em;
  bottom: 0.5em;
  .right-panel {
    max-height: 100%;
    flex-direction: column;
  }
}
</style>
