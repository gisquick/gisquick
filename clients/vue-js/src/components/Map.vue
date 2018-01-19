<template>
  <div class="map-container">
    <div ref="mapEl" class="map" />
    <bottom-toolbar :project="project" />

    <transition name="slide">
      <content-panel v-show="panelVisible" :baseLayers="baseLayers" :overlays="overlays" />
    </transition>
    <v-btn flat icon
      class="panel-toggle"
      :class="{expanded: panelVisible}"
      @click="panelVisible = !panelVisible">
      <icon name="arrow-right" />
    </v-btn>

    <scale-line class="scale-line" :style="{left: panelVisible ? '280px' : 0}" />
  </div>
</template>

<script>
import 'ol/ol.css'

import { layersList, createMap } from '../map-builder'
import ContentPanel from './ContentPanel/ContentPanel'
import BottomToolbar from './BottomToolbar'
import ScaleLine from './ScaleLine'

export default {
  name: 'Map',
  components: { ContentPanel, BottomToolbar, ScaleLine },
  props: [
    'project'
  ],
  provide: {
    $map: this.map
  },
  data () {
    return {
      // scale: -1,
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
  },
  mounted () {
    this.map.setTarget(this.$refs.mapEl)
  }
}
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style lang="scss">
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

.scale-line {
  transition: left .3s cubic-bezier(.25,.8,.5,1);
}
.slide-enter-active, .slide-leave-active {
  transition: transform .3s cubic-bezier(.25,.8,.5,1);
}
.slide-enter, .slide-leave-to {
  transform: translate3d(-100%, 0, 0);
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

</style>
