<template>
  <div>
    <!-- Header -->
    <tabs-header @close="close">
      <template slot="tabs">
        <a
          v-for="(item, index) in data"
          :key="index"
          :class="{ active: layerIndex === index }"
          @click="setActiveLayer(index)"
        >
          {{ item.layer.title }}
        </a>
      </template>
    </tabs-header>

    <!-- Table -->
    <div class="table-container">
      <!-- <transition name="tabslide"> -->
      <switch-transition>
        <v-data-table
          :key="layerIndex"
          :headers="headers"
          :items="features"
          hide-actions
        >
          <template slot="items" slot-scope="props">
            <tr
              :class="{selected: layersSelection[layer.name] === props.item.ol_uid}"
              @click="selectFeature(props.item, props.index)"
            >
              <td
                class="icon px-3"
                @click="zoomToFeature(props.item)"
              >
                <icon name="zoom-to"/>
              </td>
              <td v-for="attr in layer.attributes" :key="attr.name">
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
import TabsHeader from './TabsHeader'

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
  components: { TabsHeader },
  props: ['data'],
  data () {
    return {
      layerIndex: 0,
      layersSelection: {}
    }
  },
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
    close () {
      this.$root.$panel.setPanel(null)
    },
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
        map.getView().fit(Extent.buffer(extent, buffer), { duration: 450 })
      }
    }
  }
}
</script>

<style lang="scss" scoped>
.table-container {
  pointer-events: auto;
  background-color: #fff;
  box-shadow: 0 -5px 8px 0 rgba(0,0,0,.12), 0 -4px 4px -2px rgba(0,0,0,.18);
}
/deep/ table.v-table {
  thead {
    tr {
      height: 2em;
      background-color: #ddd;
    }
  }
  tbody {
    tr {
      &.selected {
        background-color: rgba(3,169,244, 0.25)!important;
      }
    }
    td {
      height: 2.5em;
      &.icon {
        cursor: pointer;
        .icon {
          display: block;
          width: 1.5em;
          height: 1.5em;
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
