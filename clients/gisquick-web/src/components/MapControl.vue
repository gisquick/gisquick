<template>
  <div class="map-control f-col dark">
    <transition name="fade">
      <div v-if="compassVisible">
        <v-btn
          class="compass icon"
          @click="resetNorth"
        >
          <v-icon
            name="compass"
            size="30"
            :style="compassStyle"
          />
        </v-btn>
      </div>
    </transition>
    <v-btn
      v-if="location"
      class="icon"
      @click="zoomToLocation"
    >
      <v-icon name="target-center"/>
    </v-btn>
    <v-btn
      class="zoom-in icon"
      @click="zoomIn"
    >
      <v-icon name="plus"/>
    </v-btn>
    <v-btn
      class="zoom-out icon"
      @click="zoomOut"
    >
      <v-icon name="minus"/>
    </v-btn>
    <v-btn
      class="icon"
      @click="zoomToMax"
    >
      <v-icon name="zoom-max"/>
    </v-btn>
  </div>
</template>

<script lang="js">
import { mapState } from 'vuex'
import { unByKey } from 'ol/Observable'
import ZoomControl from 'ol/control/Zoom'

export default {
  name: 'map-control',
  data () {
    return {
      rotation: 0
    }
  },
  computed: {
    ...mapState(['project', 'location']),
    compassVisible () {
      return this.rotation !== 0
    },
    compassStyle () {
      return {
        transform: `rotate(${this.rotation}rad)`
      }
    }
  },
  created () {
    this.zoom = Object.create(ZoomControl.prototype)
    Object.assign(this.zoom, {
      duration_: 250,
      getMap: () => this.$map
    })
  },
  mounted () {
    const listener = this.$map.getView().on('change:rotation', (e) => {
      this.rotation = e.target.get(e.key)
    })
    this.$once('hook:beforeDestroy', () => {
      unByKey(listener)
    })
  },
  methods: {
    zoomIn (evt) {
      this.zoom.handleClick_(1, evt)
    },
    zoomOut (evt) {
      this.zoom.handleClick_(-1, evt)
    },
    zoomToMax () {
      const extent = this.project.config.project_extent
      const padding = this.$map.ext.visibleAreaPadding()
      this.$map.getView().fit(extent, { duration: 400, padding })
    },
    resetNorth () {
      this.$map.getView().animate({ rotation: 0, duration: 300 })
    },
    zoomToLocation () {
      this.$map.getView().animate({ center: this.location.position, duration: 400 })
    }
  }
}
</script>

<style lang="scss" scoped>
.map-control {
  .btn {
    background-color: var(--color-dark);
    width: 32px;
    height: 32px;
    margin: 2px;
    border-radius: 6px;
    opacity: 0.9;
    &.zoom-in {
      border-bottom-left-radius: 2px;
      border-bottom-right-radius: 2px;
      margin-bottom: 1px;
    }
    &.zoom-out {
      border-top-left-radius: 2px;
      border-top-right-radius: 2px;
      margin-top: 0;
    }
  }
}
</style>
