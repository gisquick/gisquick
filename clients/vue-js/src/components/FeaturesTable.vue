<template>
  <div>
    <v-layout class="row tabs" v-if="data.length">
      <a
        v-for="(item, index) in data"
        :class="{ active: layerIndex === index }"
        @click="setActiveLayer(index)">
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
          :items="features"
          hide-actions>
          <template slot="items" slot-scope="props">
            <tr
              :class="{selected: layersSelection[layer.name] === props.item.ol_uid}"
              @click="selectFeature(props.item, props.index)">
              <td
                class="icon"
                @click="zoomToFeature(props.item)">
                <icon name="zoom-to"/>
              </td>
              <td v-for="attr in layer.attributes">
                {{ props.item.get(attr.name) }}
              </td>
            </tr>
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
import Extent from 'ol/extent'

function createStyle (color) {
  return new Style({
    stroke: new Stroke({
      color: color.concat(0.8),
      width: 2
    }),
    fill: new Fill({
      color: color.concat(0.5)
    }),
    image: new Circle({
      stroke: new Stroke({
        color: color.concat(0.8),
        width: 2
      }),
      fill: new Fill({
        color: color.concat(0.5)
      }),
      radius: 5
    })
  })
}
const defaultStyle = createStyle([255, 235, 59])
const selectedStyle = createStyle([3, 169, 244])

const zoomToHeader = {
  text: '',
  value: '',
  sortable: false,
  width: 1
}

export default {
  props: ['data'],
  data: () => ({
    layerIndex: 0,
    layersSelection: {}
  }),
  inject: ['$map'],
  computed: {
    layer () {
      return this.data.length ? this.data[this.layerIndex].layer : { name: '' }
    },
    features () {
      return this.data.length ? this.data[this.layerIndex].features : []
    },
    headers () {
      if (this.data.length) {
        const columns = this.layer.attributes.map(attr => ({
          text: attr.alias || attr.name,
          value: attr.name,
          align: 'left',
          sortable: false
        }))
        return [zoomToHeader].concat(columns)
      }
      return []
    }
  },
  created () {
    const source = new VectorSource()
    const vectors = new VectorLayer({
      source,
      style: defaultStyle
    })
    vectors.setMap(this.$map)
    this.layersData = {}
    this.featuresOverlay = vectors
    this.initializeSelection()
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
      this.initializeSelection()
      this.setActiveLayer(this.layerIndex)
    }
  },
  methods: {
    initializeSelection () {
      const selection = {}
      this.data.forEach(layerData => {
        selection[layerData.layer.name] = null
      })
      this.layersSelection = selection
    },
    setActiveLayer (index) {
      this.layerIndex = index
      this.featuresOverlay.getSource().clear()
      this.featuresOverlay.getSource().addFeatures(this.features)
    },
    selectFeature (feature) {
      this.featuresOverlay.getSource().forEachFeature(f => f.setStyle(null))
      feature.setStyle(selectedStyle)
      this.layersSelection[this.layer.name] = feature.ol_uid
    },
    zoomToFeature (feature, options = {}) {
      const map = this.$map
      const resolution = map.getView().getResolution()
      const padding = options.padding || [0, 0, 0, 0]
      if (feature.getGeometry().getType() === 'Point') {
        const center = feature.getGeometry().getCoordinates()
        center[0] += (-padding[3] * resolution + padding[1] * resolution) / 2
        center[1] += (-padding[2] * resolution + padding[0] * resolution) / 2
        map.getView().animate({
          center: center,
          duration: 450
        })
      } else {
        const extent = feature.getGeometry().getExtent()
        // add 5% buffer (padding)
        const buffer = (map.getSize()[0] - padding[1] - padding[3]) * 0.05 * resolution
        map.getView().fit(Extent.buffer(extent, buffer), {duration: 450})
      }
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
    tr.selected {
      background-color: rgba(3,169,244, 0.25)!important;
    }
    td {
      height: 2.5em;
      &.icon {
        cursor: pointer;
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
