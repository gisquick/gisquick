<template>
  <portal to="main-panel">
    <div class="measure-form f-col light" key="measure">
      <v-tabs-header :items="tabsItems" :value="type" @input="$emit('update:type', $event)"/>
      <v-tabs class="mt-1" height-transition :items="tabsItems" :value="type" @input="$emit('update:type', $event)">
        <template v-slot:location>
          <div class="f-col">
            <div class="header location">
              <translate class="label">1st coordinate</translate>
              <translate class="label">2nd coordinate</translate>
              <v-menu
                class="ml-auto"
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
            <scroll-area class="list f-col">
              <div
                v-for="(l, i) in location.items"
                :key="i"
                class="item f-row-ac"
                @mouseover="highlight(l.id)"
                @mouseleave="highlight(null)"
              >
                <div class="order-label f-row-ac" v-text="i + 1"/>
                <div class="field" v-text="l.coord1"/>
                <div class="field" v-text="l.coord2"/>
                <v-btn class="icon" @click="zoomTo(location.getFeature(l.id))">
                  <v-icon name="zoom-to"/>
                </v-btn>
                <v-btn class="icon" @click="location.remove(i)">
                  <v-icon name="delete_forever"/>
                </v-btn>
              </div>
            </scroll-area>
          </div>
        </template>

        <template v-slot:distance>
          <div class="f-col">
            <div class="header distance">
              <translate class="label">Total length</translate>
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
            <scroll-area class="list f-col">
              <div
                v-for="(d, i) in distance.items"
                :key="i"
                class="item f-row-ac"
                @mouseover="highlight(d.id)"
                @mouseleave="highlight(null)"
              >
                <div class="order-label f-row-ac" v-text="i + 1"/>
                <div class="field" v-text="d.length"/>
                <v-btn class="icon" @click="zoomTo(distance.getFeature(d.id))">
                  <v-icon name="zoom-to"/>
                </v-btn>
                <v-btn class="icon" @click="distance.remove(i)">
                  <v-icon name="delete_forever"/>
                </v-btn>
              </div>
            </scroll-area>
          </div>
        </template>

        <template v-slot:area>
          <div class="f-col">
            <div class="header area">
              <translate class="label">Perimeter</translate>
              <translate class="label">Area</translate>
              <v-menu
                class="ml-auto"
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
            <scroll-area class="list f-col">
              <div
                v-for="(a, i) in area.items"
                :key="i"
                class="item f-row-ac"
                @mouseover="highlight(a.id)"
                @mouseleave="highlight(null)"
              >
                <div class="order-label f-row-ac" v-text="i + 1"/>
                <div class="field" v-text="a.perimeter"/>
                <div class="field" v-text="a.area"/>
                <v-btn class="icon" @click="zoomTo(area.getFeature(a.id))">
                  <v-icon name="zoom-to"/>
                </v-btn>
                <v-btn class="icon" @click="area.remove(i)">
                  <v-icon name="delete_forever"/>
                </v-btn>
              </div>
            </scroll-area>
          </div>
        </template>
      </v-tabs>
    </div>
  </portal>
</template>

<script>
import Vue from 'vue'
import { mapState } from 'vuex'
import { getCenter } from 'ol/extent'

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

export default {
  name: 'measure',
  components: { VTabs, VTabsHeader },
  // mixins: [DynamicHeight],
  props: {
    type: String,
    state: Object
  },
  data () {
    return this.state || {
    // return {
      tools: null,
      formatter: {
        length: null,
        area: null
      },
      unitSystem: null,
    }
  },
  computed: {
    ...mapState(['project']),
    tr () {
      return {
        Menu: this.$gettext('Menu'),
        Clear: this.$gettext('Clear'),
        ClearAll: this.$gettext('Clear all'),
        CoordinateSystems: this.$gettext('Coordinate systems'),
        Units: this.$gettext('Units')
      }
    },
    availableUnits () {
      return Units
    },
    coordinateSystems () {
      if (this.project.config.projection !== 'EPSG:4326') {
        const proj = this.$map.getView().getProjection()
        const precision = this.project.config.position_precision
          ? this.project.config.position_precision.decimal_places // old API
          : this.project.config.units.position_precision // new API
        const projFormat = projectionCoordinatesFormatter(proj, precision)
        return [projFormat].concat(LocationUnits)
      }
      return LocationUnits
    },
    location () {
      return this.tools.location
    },
    distance () {
      return this.tools.distance
    },
    area () {
      return this.tools.area
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
        checked: this.location?.format?.name === cs.name,
        action: () => this.location.setFormat(cs)
      }))
      return [
        { text: this.tr.Clear, icon: 'point', action: () => this.clear() },
        { text: this.tr.ClearAll, action: () => this.clearAll() },
        { separator: true, text: this.tr.CoordinateSystems },
        ...csItems
      ]
    },
    distanceMenuItems () {
      return [
        { text: this.tr.Clear, icon: 'line', action: () => this.clear() },
        { text: this.tr.ClearAll, action: () => this.clearAll() },
        { separator: true, text: this.tr.Units },
        ...this.createUnitsMenu('length')
      ]
    },
    areaMenuItems () {
      return [
        { text: this.tr.Clear, icon: 'polygon', action: () => this.clear() },
        { text: this.tr.ClearAll, action: () => this.clearAll() },
        { separator: true, text: this.tr.Units },
        ...this.createUnitsMenu('area')
      ]
    }
  },
  created () {
    if (!this.tools) {
      const tools = Object.freeze({
        location: LocationMeasure(),
        distance: DistanceMeasure(),
        area: AreaMeasure()
      })
      observable(tools.location, 'coord1', 'coord2', 'format', 'items')
      observable(tools.distance, 'length', 'items')
      observable(tools.area, 'area', 'perimeter', 'items')
      this.tools = tools
      tools.location.setFormat(this.coordinateSystems[0])
      this.setUnits(this.availableUnits[0])
      this.$emit('update:state', this.$data)
    }
    activeTool = this.tools[this.type]
  },
  beforeDestroy () {
    this.$emit('update:state', this.$data)
    this.deactivate()
    this.$map.getViewport().style.cursor = ''
  },
  mounted () {
    if (activeTool) {
      activeTool.activate(this.$map)
    }
    // this.location.setVisibility(true)
    // this.distance.setVisibility(true)
    // this.area.setVisibility(true)
    this.$map.getViewport().style.cursor = 'crosshair'
  },
  deactivated () {
    this.deactivate()
  },
  watch: {
    type: 'onTabChange'
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
          center: getCenter(feature.getGeometry().getExtent()),
          duration: 450
        })
      }
    },
    clear () {
      activeTool.clear()
    },
    clearAll () {
      this.location.clear()
      this.distance.clear()
      this.area.clear()
    },
    highlight (index) {
      activeTool.highlight(index)
    },
    deactivate () {
      if (activeTool) {
        activeTool.deactivate()
      }
      // this.location.setVisibility(false)
      // this.distance.setVisibility(false)
      // this.area.setVisibility(false)
    }
  }
}
</script>

<style lang="scss" scoped>
.measure-form {
  min-width: 0;
  max-width: 100%;
  .field {
    flex: 1;
    margin-inline: 6px;
    align-items: flex-end;
    font-size: 14px;
    height: 24px;
    white-space: nowrap;
    border-bottom: 1px solid #ccc;
  }
  .list {
    max-height: 40vh;
    min-height: 3px;
    .order-label {
      background-color: #333;
      color: #ffff;
      border-radius: 50%;
      width: 16px;
      height: 16px;
      margin: 3px;
      justify-content: center;
      font-size: 10px;
      font-weight: 500;
    }
    .item {
      padding-block: 4px;
      margin-block: 2px;
      &:hover {
        background-color: #eee;
      }
      .btn {
        --gutter: 1px;
        padding: 2px;
      }
    }
  }
  .header {
    padding-left: 24px;
    display: grid;
    align-items: center;
    background-color: #f5f5f5;
    border-block: 1px solid #ddd;
    .menu .btn {
      margin: 2px;
    } 
    &.location, &.area {
      grid-template-columns: 1fr 1fr 48px;
    }
    &.distance {
      grid-template-columns: 1fr auto;
    }
    .label {
      color: #646464;
      font-size: 12px;
      line-height: 1.2;
      flex-grow: 1;
      padding: 2px 6px;
    }
  }
  .select {
    background-color: #f5f5f5;
    // --gutter: 0;
    margin: 0;
    padding: 3px 6px;
    border-block: 1px solid #ddd;
    font-size: 15px;
    padding-top: 6px;
  }
}
</style>
