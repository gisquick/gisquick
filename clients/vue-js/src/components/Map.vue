<template>
  <div class="map-container">
    <div ref="mapEl" class="map" />
    <bottom-toolbar :project="project" />

    <transition name="slide">
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

        <content-panel
          :baseLayers="baseLayers"
          :overlays="overlays" />
      </div>
    </transition>
    <v-btn
      flat icon
      class="panel-toggle"
      :class="{expanded: panelVisible}"
      @click="panelVisible = !panelVisible">
      <icon name="arrow-right" />
    </v-btn>

    <tools-menu :style="{left: panelVisible ? '280px' : 0}" />

    <scale-line class="scale-line" :style="{left: panelVisible ? '280px' : 0}" />

    <transition name="bslide">
      <div v-if="bottomPanel" :style="{left: panelVisible ? '280px' : 0}"
        class="bottom-panel">
        <div
          :is="bottomPanel.component"
          v-bind="bottomPanel.props"
           />
      </div>
    </transition>
  </div>
</template>

<script>
import 'ol/ol.css'

import { layersList, createMap } from '../map-builder'
import ContentPanel from './ContentPanel/ContentPanel'
import BottomToolbar from './BottomToolbar'
import ScaleLine from './ScaleLine'
import ToolsMenu from './ToolsMenu'

export default {
  name: 'Map',
  components: { ContentPanel, BottomToolbar, ScaleLine, ToolsMenu },
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
      panelVisible: true,
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
    this.map = createMap(this.project)
    this._provided.$map = this.map
    this._provided.$project = this.project

    // this.$root.constructor.prototype.$panel = {}
    this.$root.$panel = {
      setPanel: (component, props) => {
        this.topContainer = component
          ? { component, props, title: component.name }
          : null
      },
      setBottomPanel: (component, props) => {
        console.log(props)
        this.bottomPanel = component
          ? { component, props }
          : null
      }
    }
  },
  mounted () {
    this.map.setTarget(this.$refs.mapEl)
  }
}
</script>

<style lang="scss">
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

  .ol-attribution {
    bottom: 2.25em;
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
  }

  .ol-control {
    button {
      background-color: #333;
      border-radius: 4px;
    }
  }
}

.scale-line, .speed-dial, .bottom-panel {
  transition: left .4s cubic-bezier(.25,.8,.5,1);
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
    left: 280px;
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

.bottom-panel {
  position: absolute;
  right: 0;
  left: 0;
  bottom: 0;
  box-shadow: 0 -5px 8px 0 rgba(0,0,0,.12), 0 -4px 4px -2px rgba(0,0,0,.18);
}
</style>
