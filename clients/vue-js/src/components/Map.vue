<template>
  <div class="map-container">
    <div ref="mapEl" class="map" />

    <!-- <collapse-transition name="bslide"> -->
      <bottom-toolbar v-if="statusBarVisible && !bottomPanel" />
    <!-- </collapse-transition> -->

    <v-layout
      class="column map-view"
      :style="{ left: mapView.left }">

      <div class="visible-container">
        <scale-line v-if="!bottomPanel" />
        <div ref="attributions" />

        <div
          v-if="overlayContainer"
          class="map-overlay"
          :is="overlayContainer.component"
          v-bind="overlayContainer.props"
          v-on="overlayContainer.listeners" />

        <tools-menu />
        <map-control />
        <app-menu />
        <v-btn
          flat icon
          class="panel-toggle"
          :class="{expanded: panelVisible}"
          @click="panelVisible = !panelVisible">
          <icon name="arrow-right" />
        </v-btn>
      </div>

      <div
        class="bottom-container"
        :style="{minHeight: mapView.bottom}">
        <collapse-transition>
          <div
            v-if="bottomPanel"
            :is="bottomPanel.component"
            v-bind="bottomPanel.props" />
        </collapse-transition>
      </div>
    </v-layout>

    <transition
      name="slide"
      @beforeLeave="mapView.left = '0'"
      @beforeEnter="mapView.left = '280px'">
      <div
        v-show="panelVisible"
        class="main-panel">

        <collapse-transition class="collapsible">
          <div v-if="topContainer">
            <v-toolbar dark flat height="30">
              <v-spacer></v-spacer>
              <h4>{{ topContainer.title }}</h4>
              <v-spacer></v-spacer>
              <v-btn flat @click="topContainer = null">
                <v-icon>close</v-icon>
              </v-btn>
            </v-toolbar>

            <switch-transition>
              <div :is="topContainer.component" v-bind="topContainer.props" />
            </switch-transition>
          </div>
        </collapse-transition>

        <content-panel :baseLayers="baseLayers" :overlays="overlays" />
      </div>
    </transition>

  </div>
</template>

<script>
import 'ol/ol.css'
import Attribution from 'ol/control/attribution'

import { layersList, createMap } from '../map-builder'
import ContentPanel from './ContentPanel/ContentPanel'
import BottomToolbar from './BottomToolbar'
import ScaleLine from './ScaleLine'
import ToolsMenu from './ToolsMenu'
import AppMenu from './AppMenu'
import MapControl from './MapControl'

export default {
  name: 'Map',
  components: { ContentPanel, BottomToolbar, ScaleLine, ToolsMenu, AppMenu, MapControl },
  props: [
    'project'
  ],
  provide: {
    $map: this.map,
    $project: this.project
  },
  data () {
    return {
      topContainer: null,
      bottomPanel: null,
      overlayContainer: null,
      panelVisible: true,
      statusBarVisible: true,
      mapView: {
        left: '280px',
        bottom: '32px'
      },
      baseLayers: {
        tree: this.project.base_layers,
        list: layersList(this.project.base_layers, true)
      },
      overlays: {
        topics: this.project.topics,
        tree: this.project.layers,
        list: layersList(this.project.layers, true)
      }
    }
  },
  created () {
    this.map = createMap(this.project, {zoom: false, attribution: false})
    this._provided.$map = this.map
    this._provided.$project = this.project

    // this.$root.constructor.prototype.$panel = {}
    this.$root.$panel = {
      setPanel: (component, props) => {
        if (!this.panelVisible) {
          this.panelVisible = true
        }
        this.topContainer = component ? { component, props, title: component.title } : null
      },
      setBottomPanel: (component, props) => {
        this.bottomPanel = component ? { component, props } : null
      },
      setOverlay: (component, props, listeners) => {
        this.overlayContainer = component ? { component, props, listeners } : null
      },
      setStatusBarVisible: (visible) => {
        this.statusBarVisible = visible
        this.mapView.bottom = visible ? '32px' : '0'
      }
    }
  },
  mounted () {
    this.map.setTarget(this.$refs.mapEl)
    this.map.addControl(new Attribution({
      target: this.$refs.attributions
    }))
  }
}
</script>

<style lang="scss">

.map-view {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  transition: left .4s cubic-bezier(.25,.8,.5,1);
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
}

.scale-line {
  position: absolute;
  left: 0;
  bottom: 0;
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

  .toolbar {
    h4 {
      text-transform: uppercase;
      font-size: 90%;
    }
    .btn {
      height: 100%;
      margin: 0;
      min-width: 2em;
      width: 2.25em;
      position: absolute;
      right: 0;
    }
  }
}

.panel-toggle {
  position: absolute;
  margin: 0;
  left: 0;
  top: calc(50% - 18px);

  &.expanded {
    transform: rotateY(180deg);
  }
  .icon {
    width: 24px;
    height: 24px;
  }
}

.speed-dial {
  position: absolute;
  top: 0;
}

.bottom-container {
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  position: relative;
  .collapse-enter-active, .collapse-leave-active {
    overflow: visible!important;
  }
  /*.collapse-enter, .collapse-leave-to {
    opacity: 0!important;
  }*/

  > * {
    box-shadow: 0 -5px 8px 0 rgba(0,0,0,.12), 0 -4px 4px -2px rgba(0,0,0,.18);
  }
}

.map-overlay {
  position: absolute;
  left: 0;
  right: 0;
  top: 0;
  bottom: 0;
}
.bottom-toolbar {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
}
.map-control {
  position: absolute;
  right: 0.5em;
  bottom: 0.5em;
}
.app-menu {
  position: absolute;
  right: 0.5em;
  top: 0.5em;
}

.ol-attribution {
  bottom: 0.25em;
  right: 3em;
  a[href="https://openlayers.org/"] {
    display: none;
  }
  a:link, a:visited {
    text-decoration: none;
    color: #333;
  }
  a:hover {
    color: rgb(0, 150, 190);
    text-shadow: none;
    background-color: rgba(255, 255, 255, 0.8);
    border-radius: 3px;
  }
  li > *::after {
    color: #333;
    content: "|";
    pointer-events: none;
    padding-left: 9px;
    padding-right: 5px;
  }
  li:last-child > *::after {
    display: none;
  }
  button {
    display: none;
  }
}
</style>
