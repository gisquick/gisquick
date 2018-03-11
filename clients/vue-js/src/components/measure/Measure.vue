<template>
  <div class="measure-form">
    <v-tabs
      icons-and-text
      v-model="type"
      @input="onTabChange">
      <v-tabs-slider color="primary" />
      <v-tab href="#location">
        <span>Location</span>
        <icon name="point" />
      </v-tab>
      <v-tab href="#distance">
        <span>Distance</span>
        <icon name="line" />
      </v-tab>
      <v-tab href="#area">
        <span>Area</span>
        <icon name="polygon" />
      </v-tab>

      <v-tabs-items style="{height: tabHeight}">
        <v-tab-item id="location">
          <v-layout column pt-3 pb-1>
            <v-layout row>
              <v-flex class="label px-1 xs6">1st coordinate</v-flex>
              <v-flex class="label px-1 xs6">2nd coordinate</v-flex>
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
              <v-list-tile
                v-for="format in coordinateSystems"
                :key="format.name"
                class="checkable"
                @click="location.setFormat(format)">
                <v-icon
                  class="check"
                  v-show="location.format === format">check
                </v-icon>
                <v-list-tile-title>{{ format.name }}</v-list-tile-title>
              </v-list-tile>
            </v-list>
          </v-menu>
        </v-tab-item>

        <v-tab-item id="distance">
          <v-layout column pt-3 pb-1>
            <v-layout row>
              <v-flex class="label px-1">Last segment</v-flex>
              <v-flex class="label px-1">Total length</v-flex>
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
                <template v-for="(system, i) in availableUnits">
                  <v-list-tile
                    class="checkable"
                    :class="{expanded: expandedItem === `D${i}`}"
                    @click="setUnits(system)">
                    <v-icon
                      class="check"
                      v-show="unitSystem === system">check
                    </v-icon>
                    <v-list-tile-title>{{ system.name }}</v-list-tile-title>
                    <v-btn icon
                      @click.stop="toggleExpanded(`D${i}`)">
                      <v-icon class="expand">keyboard_arrow_down</v-icon>
                    </v-btn>
                  </v-list-tile>
                  <v-collapsible v-show="expandedItem === `D${i}`">
                    <v-list-tile
                      v-for="unit in system.length"
                      :key="unit.name"
                      class="checkable nested"
                      @click="setUnits(system, unit)">
                      <v-icon class="check" v-show="formatter.length === unit.length">check_circle</v-icon>
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
              <v-flex class="label px-1">Perimeter</v-flex>
              <v-flex class="label px-1">Area</v-flex>
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
                <template v-for="(system, i) in availableUnits">
                  <v-list-tile
                    class="checkable"
                    :class="{expanded: expandedItem === `A${i}`}"
                    @click="setUnits(system)">
                    <v-icon
                      class="check"
                      v-show="unitSystem === system">check
                    </v-icon>
                    <v-list-tile-title>{{ system.name }}</v-list-tile-title>
                    <v-btn icon
                      @click.stop="toggleExpanded(`A${i}`)">
                      <v-icon class="expand">keyboard_arrow_down</v-icon>
                    </v-btn>
                  </v-list-tile>
                  <v-collapsible v-show="expandedItem === `A${i}`">
                    <v-list-tile
                      v-for="unit in system.area"
                      :key="unit.name"
                      class="checkable nested"
                      @click="setUnits(system, unit)">
                      <v-icon
                        class="check"
                        v-show="formatter.area === unit.area">check_circle
                      </v-icon>
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
</template>

<script>
import Vue from 'vue'
// import DynamicHeight from '../../tabs-dynamic-height'
import { projectionCoordinatesFormatter, LocationUnits, Units } from './units'
import { LocationMeasure, DistanceMeasure, AreaMeasure } from './measure'

let state

// function makeReactive (obj, ...props) {
//   props.forEach(prop => Vue.util.defineReactive(obj, prop))
// }

function PartiallyReactive (attributes) {
  Object.values(attributes).forEach(attr => {
    attr.enumerable = true
    attr.configurable = false
    attr.reactive.forEach(prop => Vue.util.defineReactive(attr.value, prop))
  })
  return Object.defineProperties({}, attributes)
}

export default {
  name: 'measure',
  icon: 'ruler',
  // mixins: [DynamicHeight],
  inject: ['$project', '$map'],
  data () {
    return state ||
      Object.assign({
        type: '',
        coordinateSystems: null,
        availableUnits: Units,
        formatter: {
          length: null,
          area: null
        },
        unitSystem: null,
        expandedItem: null
      },
      PartiallyReactive({
        location: {
          value: LocationMeasure(),
          reactive: ['coord1', 'coord2', 'format']
        },
        distance: {
          value: DistanceMeasure(),
          reactive: ['total', 'lastSegment']
        },
        area: {
          value: AreaMeasure(),
          reactive: ['area', 'perimeter']
        }
      })
    )
  },
  created () {
    if (!this.coordinateSystems) {
      const proj = this.$map.getView().getProjection()
      this.coordinateSystems = LocationUnits
      if (proj.getCode() !== 'EPSG:4326') {
        const projFormat = projectionCoordinatesFormatter(proj, this.$project.position_precision.decimal_places)
        this.coordinateSystems = [projFormat].concat(this.coordinateSystems)
      }
      this.location.setFormat(this.coordinateSystems[0])
      this.setUnits(Units[0])
    }
    // tools.location.on('change', e => {
    //   this.coord1 = e.values.coord1
    //   this.coord2 = e.values.coord2
    // })
  },
  beforeDestroy () {
    this.deactivate()
    state = this.$data
  },
  activated () {
    if (this.activeTool) {
      this.activeTool.activate(this.$map)
    }
  },
  deactivated () {
    this.deactivate()
  },
  methods: {
    onTabChange (tab) {
      if (this.activeTool !== this[tab]) {
        // this.tabChanged(tab) // for dynamic height animation
        if (this.activeTool) {
          this.activeTool.deactivate()
        }
        this.activeTool = this[tab]
        this.activeTool.activate(this.$map)
      }
    },
    toggleExpanded (item) {
      this.expandedItem = this.expandedItem === item ? null : item
    },
    setUnits (unitSystem, unit = {}) {
      if (unitSystem !== this.unitSystem) {
        console.log('Unit SYSTEM Change')
        this.formatter.length = null
        this.formatter.area = null
      }
      this.formatter.length = unit.length || this.formatter.length || unitSystem.length[0].length
      this.formatter.area = unit.area || unitSystem.area[0].area
      this.distance.setFormat(this.formatter)
      this.area.setFormat(this.formatter)
      this.unitSystem = unitSystem
    },
    deactivate () {
      if (this.activeTool) {
        this.activeTool.deactivate()
      }
    }
  }
}
</script>

<style lang="scss">
.measure.menu__content {

  .list__tile {
    min-width: 220px;
    padding-right: 0;
    font-size: 0.875em;
    height: 3em;
  }
  .expanded {
    .icon.expand {
      transform: rotateZ(180deg);
    }
  }
  .checkable {
    .list__tile {
      padding-left: 3em;
      line-height: 2.5em;
      .icon.check {
        position: absolute;
        left: 0.5em;
        top: 0.38em;
      }
    }
    &.nested {
      .list__tile {
        opacity: 0.75;
        padding-left: 4em;
        .icon.check {
          left: 1em;
        }
      }
    }
  }
}

.measure-form {
  .tabs__items {
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
  .menu {
    position: absolute;
    right: 0;
    top: 0;
    .menu__activator .btn {
      color: #aaa;
      margin: 0;
    }
  }
}
</style>