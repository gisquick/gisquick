<template>
  <portal to="main-panel">
    <div class="measure-form" key="measure">
      <v-tabs
        icons-and-text
        v-model="type"
        @input="onTabChange"
      >
        <v-tabs-slider color="primary"/>
        <v-tab href="#location">
          <translate>Location</translate>
          <icon name="point"/>
        </v-tab>
        <v-tab href="#distance">
          <translate>Distance</translate>
          <icon name="line"/>
        </v-tab>
        <v-tab href="#area">
          <translate>Area</translate>
          <icon name="polygon"/>
        </v-tab>

        <v-tabs-items style="{height: tabHeight}">
          <v-tab-item id="location">
            <v-layout column pt-3 pb-1>
              <v-layout row>
                <v-flex class="label px-1 xs6">
                  <translate>1st coordinate</translate>
                </v-flex>
                <v-flex class="label px-1 xs6">
                  <translate>2nd coordinate</translate>
                </v-flex>
              </v-layout>
              <v-layout row>
                <v-flex class="field mx-1 xs6">{{ location.coord1 }}</v-flex>
                <v-flex class="field mx-1 xs6">{{ location.coord2 }}</v-flex>
              </v-layout>
            </v-layout>
            <v-menu bottom left content-class="measure">
              <v-btn icon slot="activator">
                <v-icon>more_vert</v-icon>
              </v-btn>
              <v-list>
                <v-list-tile @click="zoomTo(location.feature)">
                  <v-list-tile-title>
                    <translate>Zoom to</translate>
                  </v-list-tile-title>
                  <icon name="zoom-to"/>
                </v-list-tile>
                <text-separator>
                  <translate>Coordinate systems</translate>
                </text-separator>
                <v-list-tile
                  v-for="format in coordinateSystems"
                  :key="format.name"
                  class="checkable"
                  @click="location.setFormat(format)"
                >
                  <v-icon
                    class="check"
                    v-text="'check'"
                    v-show="location.format.name === format.name"
                  />
                  <v-list-tile-title>{{ format.name }}</v-list-tile-title>
                </v-list-tile>
              </v-list>
            </v-menu>
          </v-tab-item>

          <v-tab-item id="distance">
            <v-layout column pt-3 pb-1>
              <v-layout row>
                <v-flex class="label px-1">
                  <translate>Last segment</translate>
                  </v-flex>
                <v-flex class="label px-1">
                  <translate>Total length</translate>
                </v-flex>
              </v-layout>
              <v-layout row>
                <v-flex class="field mx-1 xs6">{{ distance.lastSegment }}</v-flex>
                <v-flex class="field mx-1 xs6">{{ distance.total }}</v-flex>
              </v-layout>
              <v-menu bottom left content-class="measure">
                <v-btn icon slot="activator">
                  <v-icon>more_vert</v-icon>
                </v-btn>
                <v-list>
                  <v-list-tile @click="zoomTo(distance.feature)">
                    <v-list-tile-title>
                      <translate>Zoom to</translate>
                    </v-list-tile-title>
                    <icon name="zoom-to"/>
                  </v-list-tile>
                  <text-separator>
                    <translate>Units</translate>
                  </text-separator>
                  <template v-for="(system, i) in availableUnits">
                    <v-list-tile
                      :key="`group_${i}`"
                      class="checkable"
                      :class="{expanded: expandedItem === `D${i}`}"
                      @click="setUnits(system)"
                    >
                      <v-icon
                        class="check"
                        v-text="'check'"
                        v-show="unitSystem === system"
                      />
                      <v-list-tile-title>{{ system.name }}</v-list-tile-title>
                      <v-btn icon
                        @click.stop="toggleExpanded(`D${i}`)">
                        <v-icon class="expand">keyboard_arrow_down</v-icon>
                      </v-btn>
                    </v-list-tile>
                    <v-collapsible
                      :key="i"
                      v-show="expandedItem === `D${i}`"
                    >
                      <v-list-tile
                        v-for="unit in system.length"
                        :key="unit.name"
                        class="checkable nested"
                        @click="setUnits(system, unit)"
                      >
                        <v-icon
                          class="check"
                          v-text="'check_circle'"
                          v-show="formatter.length === unit.length"
                        />
                        <v-list-tile-title>{{ unit.name }}</v-list-tile-title>
                      </v-list-tile>
                    </v-collapsible>
                  </template>
                </v-list>
              </v-menu>
            </v-layout>
          </v-tab-item>

          <v-tab-item id="area">
            <v-layout column pt-3 pb-1>
              <v-layout row>
                <v-flex class="label px-1">
                  <translate>Perimeter</translate>
                </v-flex>
                <v-flex class="label px-1">
                  <translate>Area</translate>
                </v-flex>
              </v-layout>
              <v-layout row>
                <v-flex class="field mx-1 xs6">{{ area.perimeter }}</v-flex>
                <v-flex class="field mx-1 xs6">{{ area.area }}</v-flex>
              </v-layout>
              <v-menu bottom left content-class="measure">
                <v-btn icon slot="activator">
                  <v-icon>more_vert</v-icon>
                </v-btn>
                <v-list>
                  <v-list-tile @click="zoomTo(area.feature)">
                    <v-list-tile-title>
                      <translate>Zoom to</translate>
                    </v-list-tile-title>
                    <icon name="zoom-to"/>
                  </v-list-tile>
                  <text-separator>
                    <translate>Units</translate>
                  </text-separator>
                  <template v-for="(system, i) in availableUnits">
                    <v-list-tile
                      :key="`group_${i}`"
                      class="checkable"
                      :class="{expanded: expandedItem === `A${i}`}"
                      @click="setUnits(system)"
                    >
                      <v-icon
                        class="check"
                        v-text="'check'"
                        v-show="unitSystem === system"
                      />
                      <v-list-tile-title>{{ system.name }}</v-list-tile-title>
                      <v-btn icon @click.stop="toggleExpanded(`A${i}`)">
                        <v-icon class="expand">keyboard_arrow_down</v-icon>
                      </v-btn>
                    </v-list-tile>
                    <v-collapsible
                      :key="i"
                      v-show="expandedItem === `A${i}`"
                    >
                      <v-list-tile
                        v-for="unit in system.area"
                        :key="unit.name"
                        class="checkable nested"
                        @click="setUnits(system, unit)"
                      >
                        <v-icon
                          class="check"
                          v-text="'check_circle'"
                          v-show="formatter.area === unit.area"
                        />
                        <v-list-tile-title>{{ unit.name }}</v-list-tile-title>
                      </v-list-tile>
                    </v-collapsible>
                  </template>
                </v-list>
              </v-menu>
            </v-layout>
          </v-tab-item>
        </v-tabs-items>
      </v-tabs>
    </div>
  </portal>
</template>

<script>
import Vue from 'vue'
import { mapState } from 'vuex'
import Extent from 'ol/extent'
import { reactive } from '@/utils'
// import DynamicHeight from '../../tabs-dynamic-height'
import { projectionCoordinatesFormatter, LocationUnits, Units } from './units'
import { LocationMeasure, DistanceMeasure, AreaMeasure } from './measure'

function observable (obj, ...attrs) {
  attrs.forEach(attr => Vue.util.defineReactive(obj, attr))
  return obj
}

let activeTool

const data = {
  type: '',
  formatter: {
    length: null,
    area: null
  },
  unitSystem: null,
  expandedItem: null,
}
const measureTools = {
  location: LocationMeasure(),
  distance: DistanceMeasure(),
  area: AreaMeasure()
}

export default {
  name: 'measure',
  // mixins: [DynamicHeight],
  data () {
    return data
  },
  computed: {
    ...mapState(['project']),
    availableUnits () {
      return Units
    },
    coordinateSystems () {
      if (this.project.config.projection.code !== 'EPSG:4326') {
        const proj = this.$map.getView().getProjection()
        const projFormat = projectionCoordinatesFormatter(proj, this.project.config.position_precision.decimal_places)
        return [projFormat].concat(LocationUnits)
      }
      return LocationUnits
    },
    location () {
      return observable(measureTools.location, 'coord1', 'coord2', 'format')
    },
    distance () {
      return observable(measureTools.distance, 'total', 'lastSegment')
    },
    area () {
      return observable(measureTools.area, 'area', 'perimeter')
    }
  },
  created () {
    if (!this.location.format) {
      this.location.setFormat(this.coordinateSystems[0])
      this.setUnits(this.availableUnits[0])
    }
  },
  beforeDestroy () {
    this.deactivate()
  },
  mounted () {
    if (activeTool) {
      activeTool.activate(this.$map)
    }
  },
  activated () {
    console.log('measure activated')
  },
  deactivated () {
    this.deactivate()
  },
  methods: {
    onTabChange (tab) {
      if (activeTool !== this[tab]) {
        // this.tabChanged(tab) // for dynamic height animation
        if (activeTool) {
          activeTool.deactivate()
        }
        activeTool = this[tab]
        activeTool.activate(this.$map)
      }
    },
    toggleExpanded (item) {
      this.expandedItem = this.expandedItem === item ? null : item
    },
    setUnits (unitSystem, unit = {}) {
      if (unitSystem !== this.unitSystem) {
        this.formatter.length = null
        this.formatter.area = null
      }
      this.formatter.length = unit.length || this.formatter.length || unitSystem.length[0].length
      this.formatter.area = unit.area || unitSystem.area[0].area
      this.distance.setFormat(this.formatter)
      this.area.setFormat(this.formatter)
      this.unitSystem = unitSystem
    },
    zoomTo (feature) {
      if (feature) {
        this.$map.getView().animate({
          center: Extent.getCenter(feature.getGeometry().getExtent()),
          duration: 450
        })
      }
    },
    deactivate () {
      if (activeTool) {
        activeTool.deactivate()
      }
    }
  }
}
</script>

<style lang="scss">
.measure-form {
  .v-tabs__items {
    will-change: height;
    transition: height .35s cubic-bezier(.25,.8,.5,1);
  }
  .label {
    opacity: 0.55;
    font-size: 0.75em;
  }
  .field {
    font-size: 0.875em;
    height: 2.5em;
    line-height: 3em;
    border-bottom: 1px solid #ccc;
  }
  .v-menu {
    position: absolute;
    right: 0;
    top: 0;
    .v-menu__activator .v-btn {
      color: #aaa;
      margin: 0;
    }
  }
}
</style>