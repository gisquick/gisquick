<template>
  <div>
    <v-layout class="row tabs" v-if="data.length">
      <a
        v-for="(item, index) in data"
        :class="{ active: layerIndex === index }"
        @click="setActiveLayer(index)"
      >
        {{ item.layer.title }}
      </a>
      <div class="tab-end"></div>
    </v-layout>
    <div class="table-container">
      <!-- <transition name="tabslide"> -->
      <switch-transition>
        <v-data-table
          :key="layerIndex"
          :headers="headers"
          :items="items"
          hide-actions
        >
          <template slot="items" slot-scope="props">
            <td class="icon"><icon name="zoom-to"/></td>
            <td v-for="attr in data[layerIndex].header">
              {{ props.item.get(attr.value) }}
            </td>
          </template>
        </v-data-table>
        </switch-transition>
      <!-- </transition> -->
    </div>
  </div>
</template>

<script>
import VectorSource from 'ol/source/vector'
import VectorLayer from 'ol/layer/vector'
import Style from 'ol/style/style'
import Fill from 'ol/style/fill'
import Stroke from 'ol/style/stroke'
import Circle from 'ol/style/circle'

const zoomToHeader = {
  text: '',
  value: '',
  sortable: false,
  width: 1
}
export default {
  props: ['data'],
  data: () => ({
    layerIndex: 0
  }),
  inject: ['$map'],
  computed: {
    headers () {
      return this.data.length ? [zoomToHeader].concat(this.data[this.layerIndex].header) : []
    },
    items () {
      return this.data.length ? this.data[this.layerIndex].features : []
    }
  },
  created () {
    const source = new VectorSource()
    const vectors = new VectorLayer({
      source,
      style: new Style({
        stroke: new Stroke({
          color: [250, 250, 25, 0.8],
          width: 2
        }),
        fill: new Fill({
          color: [250, 250, 25, 0.5]
        }),
        image: new Circle({
          stroke: new Stroke({
            color: [250, 250, 25, 0.8],
            width: 2
          }),
          fill: new Fill({
            color: [250, 250, 25, 0.5]
          }),
          radius: 5
        })
      })
    })
    vectors.setMap(this.$map)
    this.featuresOverlay = vectors
    this.setActiveLayer(this.layerIndex)
  },
  beforeDestroy () {
    this.featuresOverlay.setMap(null)
  },
  watch: {
    data (value) {
      if (this.layerIndex >= value.length) {
        this.layerIndex = 0
      }
      this.setActiveLayer(this.layerIndex)
    }
  },
  methods: {
    setActiveLayer (index) {
      this.layerIndex = index
      this.featuresOverlay.getSource().clear()
      this.featuresOverlay.getSource().addFeatures(this.data[index].features)
    }
  }
}
</script>

<style scoped lang="scss">
.tabs {
  position: absolute;
  height: 1.8em;
  top: -1.8em;
  background-color: #fff;
  box-shadow: -4px -4px 8px 0 rgba(0,0,0,.1), -3px -4px 4px -2px rgba(0,0,0,.12);
  border: 1px solid #aaa;
  user-select: none;
  a {
    position: relative;
    padding: 0.25em 0.75em;
    font-size: 0.813em;
    font-weight: 500;
    &:not(.active) {
      color: #606060;
    }
    &:not(:first-child)::before {
      background-color: #ccc;
      position: absolute;
      content: "";
      left: 0;
      top: 10%;
      bottom: 10%;
      width: 1px;
    }
  }
  .tab-end {
    position: absolute;
    right: -10px;
    top: -1px;
    bottom: -1px;
    width: 15px;
    transform: skewX(20deg);
    border: 1px solid #aaa;
    border-width: 1px 1px 1px 0px;
    border-top-right-radius: 5px;
    background-color: #fff;
    box-shadow: 7px -4px 6px 0 rgba(0,0,0,.1), 4px 0 3px 0 rgba(0,0,0,.12);
    box-sizing: border-box;
  }
}
</style>

<style lang="scss">
.table-container {
  background-color: #fff;
}
table.table {
  thead {
    tr {
      height: 2em;
      background-color: #ddd;
    }
    th.column {
    }
  }
  tbody {
    td {
      height: 2.5em;
      &.icon {
        padding: 0.75em;
        .icon {
          width: 20px;
          height: 20px;
          color: #777;
        }
      }
    }
  }
}

.tabslide-enter, .tabslide-leave-to {
  opacity: 0;
}
.tabslide-enter-active, .tabslide-leave-active {
  transition: all 0.5s cubic-bezier(.25,.8,.5,1);
}
.tabslide-enter, .tabslide-leave-to {
  transform: translate3d(300px, 0, 0);
}
.tabslide-leave-active {
  position: absolute;
}
</style>
