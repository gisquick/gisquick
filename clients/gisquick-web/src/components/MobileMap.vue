<template>
  <div class="map-container mobile">
    <div ref="mapEl" class="map"/>

    <swipe-container class="main-panel f-row">
      <template v-slot="{ visible }">
        <div v-show="visible" class="panel-content f-col">
          <div class="app-toolbar dark f-row-ac">
            <v-btn
              v-for="tool in toolsMenuItems"
              :key="tool.name"
              class="icon flat"
              :color="activeTool === tool.name ? 'primary' : ''"
              @click="toggleTool(tool)"
            >
              <v-icon :name="tool.icon"/>
            </v-btn>
            <v-btn
              class="icon flat"
              :color="geolocationEnabled ? 'primary' : ''"
              @click="geolocationEnabled = !geolocationEnabled"
            >
              <v-icon name="target"/>
            </v-btn>
            <div class="f-grow"/>
            <app-menu class="app-menu" align="rr;tb,bt">
              <template v-slot:activator="{ toggle }">
                <v-btn
                  aria-label="Menu"
                  class="icon flat"
                  @click="toggle"
                >
                  <v-icon name="menu"/>
                </v-btn>
              </template>
            </app-menu>
          </div>
          <hr/>
          <portal-target name="main-panel-top" class="main-panel-portal"/>
          <content-panel/>
        </div>
      </template>
    </swipe-container>

    <div ref="mapViewport" class="visible-container">
      <scale-line/>
      <map-attributions class="map-attributions"/>
      <map-control/>
    </div>
    <portal-target name="map-overlay" class="map-overlay"/>

    <div class="right-container f-col">
      <portal-target
        name="right-panel"
        class="right-panel"
        transition="slide-top-transition"
      />
      <div class="f-grow"/>
    </div>

    <map-tools ref="tools" hidden-identification mobile/>
    <transition name="fade">
      <div v-if="status.overlays.loading || status.baseLayer.loading" class="status f-row-ac m-2 shadow-2">
        <v-spinner color="primary" width="3" size="20"/>
      </div>
    </transition>
    <location-tool v-if="geolocationEnabled"/>
  </div>
</template>

<script>
import { mapState } from 'vuex'
import debounce from 'lodash/debounce'

import Map from '@/mixins/Map'
import ContentPanel from '@/components/content-panel/ContentPanel.vue'
import MapAttributions from '@/components/MapAttributions.vue'
import MapControl from '@/components/MapControl.vue'
import ScaleLine from '@/components/ol/ScaleLine.vue'
import MapTools from '@/components/MapTools.vue'
import AppMenu from '@/components/AppMenu.vue'
import SwipeContainer from '@/components/SwipeContainer.vue'
import LocationTool from '@/components/LocationTool.vue'

export default {
  name: 'Map',
  mixins: [Map],
  components: { AppMenu, ContentPanel, ScaleLine, MapAttributions, MapControl, MapTools, SwipeContainer, LocationTool },
  refs: ['tools'],
  data () {
    return {
      geolocationEnabled: false
    }
  },
  computed: {
    ...mapState(['activeTool']),
    toolsMenuItems () {
      const tools = (this.$refs.tools && this.$refs.tools.items) || []
      return tools.filter(t => !t.disabled && t.icon)
    }
  },
  created () {
    this.$root.$panel = {
      setStatusBarVisible: () => {}
    }
  },
  mounted () {
    const updateMapSize = debounce(() => this.$map.updateSize(), 100)
    window.addEventListener('resize', updateMapSize)
    this.$once('hook:beforeDestroy', () => window.removeEventListener('resize', updateMapSize))
  },
  methods: {
    toggleTool (tool) {
      const value = this.activeTool !== tool.name ? tool.name : null
      this.$store.commit('activeTool', value)
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
  height: calc(var(--vh, 1vh) * 100);
  // height: 100vh; // allow to hide browser's address bar, but makes UI slightly worse
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
    margin: 3px 0px 8px 18px;
    pointer-events: none;

    ::v-deep * {
      // prevent Swipe to go back navigation (Android)
      // touch-action: none;
      // touch-action: pan-y;
    }
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
    z-index: 10;
    justify-self: start;
  }
  .map-overlay {
    grid-column: 1 / 3;
    grid-row: 1 / 3;
    min-width: 0;
    min-height: 0;
    max-height: 100%;
    z-index: 1;
  }
  .status {
    grid-column: 1 / 2;
    grid-row: 1 / 2;
    align-self: start;
    justify-self: end;
    z-index: 10;
    background-color: #fff;
    border: 1px solid #ddd;
    border-radius: 50%;
    color: var(--color-primary);
    padding: 4px;
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
    .app-toolbar {
      background-color: #212121;
      background-color: var(--color-dark);
      height: 44px;
      border: solid;
      border-width: 1px 0;
      border-color: var(--color-red);
      border-color: rgba(#fff, 0.5);

      .btn {
        padding: 4px;
        .icon {
          width: 24px;
          height: 24px;
        }
      }
    }
    .app-menu {
      .btn {
        margin: 3px;
      }
    }
    ::v-deep .panel-header {
      height: 22px;
      .title {
        font-size: 12px;
        letter-spacing: 1px;
      }
    }
  }
}
</style>
