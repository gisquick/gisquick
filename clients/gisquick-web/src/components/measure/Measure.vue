<template>
  <portal to="main-panel">
    <div class="measure-form f-col light" key="measure">
      <v-tabs-header :items="tabsItems" v-model="type"/>
      <v-tabs class="mt-1" :items="tabsItems" v-model="type">
        <template v-slot:location>
          <div class="f-row">
            <div class="field f-col">
              <translate class="label">1st coordinate</translate>
              <span class="value">{{ location.coord1 }}</span>
            </div>
            <div class="field f-col">
              <translate class="label">2nd coordinate</translate>
              <span class="value">{{ location.coord2 }}</span>
            </div>
            <v-menu
              :aria-label="tr.Menu"
              transition="slide-y"
              align="rr;bb,tt"
              :items="locationMenuItems"
            >
              <template v-slot:activator="{ toggle }">
                <v-btn :aria-label="tr.Menu" class="icon small" @click="toggle">
                  <v-icon name="menu-dots"/>
                </v-btn>
              </template>
            </v-menu>
          </div>
        </template>

        <template v-slot:distance>
          <div class="f-row">
            <div class="field f-col">
              <translate class="label">Last segment</translate>
              <span class="value">{{ distance.lastSegment }}</span>
            </div>
            <div class="field f-col">
              <translate class="label">Total length</translate>
              <span class="value">{{ distance.total }}</span>
            </div>
            <v-menu
              :aria-label="tr.Menu"
              transition="slide-y"
              align="rr;bb,tt"
              :items="distanceMenuItems"
            >
              <template v-slot:activator="{ toggle }">
                <v-btn :aria-label="tr.Menu" class="icon small" @click="toggle">
                  <v-icon name="menu-dots"/>
                </v-btn>
              </template>
              <template v-slot:item-prepend(group-check)="{ item }">
                <v-icon :name="item.checked ? 'check' : ''" class="m-2"/>
              </template>
              <template v-slot:item(check)="{ item }">
                <span style="margin-left: 24px" class="f-grow" v-text="item.text"/>
                <v-icon :name="item.checked ? 'dot' : ''" class="p-2"/>
                <!-- <v-icon v-if="item.checked" name="dot" class="m-2"/> -->
              </template>
            </v-menu>
          </div>
        </template>

        <template v-slot:area>
          <div class="f-row">
            <div class="field f-col">
              <translate class="label">Perimeter</translate>
              <span class="value">{{ area.perimeter }}</span>
            </div>
            <div class="field f-col">
              <translate class="label">Area</translate>
              <span class="value">{{ area.area }}</span>
            </div>
            <v-menu
              :aria-label="tr.Menu"
              transition="slide-y"
              align="rr;bb,tt"
              :items="areaMenuItems"
            >
              <template v-slot:activator="{ toggle }">
                <v-btn :aria-label="tr.Menu" class="icon small" @click="toggle">
                  <v-icon name="menu-dots"/>
                </v-btn>
              </template>
              <template v-slot:item-prepend(group-check)="{ item }">
                <v-icon :name="item.checked ? 'check' : ''" class="m-2"/>
              </template>
              <template v-slot:item(check)="{ item }">
                <span style="margin-left: 24px" class="f-grow" v-text="item.text"/>
                <v-icon :name="item.checked ? 'dot' : ''" class="p-2"/>
              </template>
            </v-menu>
          </div>
        </template>
      </v-tabs>
    </div>
  </portal>
</template>

<script>
import Vue from 'vue'
import { mapState } from 'vuex'
import Extent from 'ol/extent'

import VTabs from '@/ui/Tabs.vue'
import VTabsHeader from '@/ui/TabsHeader.vue'

// import DynamicHeight from '../../tabs-dynamic-height'
import { projectionCoordinatesFormatter, LocationUnits, Units } from './units'
import { LocationMeasure, DistanceMeasure, AreaMeasure } from './measure'

function observable (obj, ...attrs) {
  attrs.forEach(attr => Vue.util.defineReactive(obj, attr))
  return obj
}

let activeTool

const data = {
  type: 'location',
  formatter: {
    length: null,
    area: null
  },
  unitSystem: null
}
const measureTools = {
  location: LocationMeasure(),
  distance: DistanceMeasure(),
  area: AreaMeasure()
}

export default {
  name: 'measure',
  components: { VTabs, VTabsHeader },
  // mixins: [DynamicHeight],
  data () {
    return data
  },
  computed: {
    ...mapState(['project']),
    tr () {
      return {
        Menu: this.$gettext('Menu')
      }
    },
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
    },
    tabsItems () {
      return [
        { key: 'location', icon: 'point', label: this.$gettext('Location') },
        { key: 'distance', icon: 'line', label: this.$gettext('Distance') },
        { key: 'area', icon: 'polygon', label: this.$gettext('Area') },
      ]
    },
    locationMenuItems () {
      const csItems = this.coordinateSystems.map(cs => ({
        text: cs.name,
        key: cs.name,
        slot: 'check',
        checked: this.location.format.name === cs.name,
        action: () => this.location.setFormat(cs)
      }))
      return [
        {
          text: this.$gettext('Zoom to'),
          icon: 'zoom-to',
          // disabled: !this.location.feature,
          action: () => this.zoomTo(this.location.feature)
        },
        { separator: true, text: this.$gettext('Coordinate systems') },
        ...csItems
      ]
    },
    distanceMenuItems () {
      return [
        { text: this.$gettext('Zoom to'), icon: 'zoom-to', action: () => this.zoomTo(this.distance.feature) },
        { separator: true, text: this.$gettext('Units') },
        ...this.createUnitsMenu('length')
      ]
    },
    areaMenuItems () {
      return [
        { text: this.$gettext('Zoom to'), icon: 'zoom-to', action: () => this.zoomTo(this.distance.feature) },
        { separator: true, text: this.$gettext('Units') },
        ...this.createUnitsMenu('area')
      ]
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
  deactivated () {
    this.deactivate()
  },
  watch: {
    type: {
      immediate: true,
      handler: 'onTabChange'
    }
  },
  methods: {
    onTabChange (tab) {
      if (activeTool !== this[tab]) {
        activeTool?.deactivate()
        activeTool = this[tab]
        activeTool.activate(this.$map)
      }
    },
    createUnitsMenu (type) {
      return this.availableUnits.map((system, i) => {
        const subitems = system[type].map(unit => ({
          text: unit.name,
          key: `${i}-${unit.name}`,
          slot: 'check',
          checked: this.unitSystem === system && this.formatter[type] === unit[type],
          action: () => this.setUnits(system, unit)
        }))
        return {
          text: system.name,
          key: `group_${i}`,
          slot: 'group-check',
          checked: this.unitSystem === system,
          action: () => this.setUnits(system),
          items: subitems
        }
      })
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

<style lang="scss" scoped>
.measure-form {
  min-width: 0;
  max-width: 100%;
  .menu {
    align-self: flex-start;
    .btn {
      margin: 4px;
    }
  }
  .field {
    flex: 1;
    margin: 6px;
    .label {
      color: #777;
      font-size: 12px;
      user-select: none;
    }
    .value {
      display: flex;
      align-items: flex-end;
      font-size: 14px;
      height: 30px;
      white-space: nowrap;
      border-bottom: 1px solid #ccc;
    }
  }
}
</style>
