<template>
  <div class="layers-list">
    <v-toolbar dark flat height="30">
      <v-spacer></v-spacer>
      <h4>Content</h4>
      <v-spacer></v-spacer>
    </v-toolbar>
    <v-tabs icons centered grow
      class="content-panel"
      v-model="activeMainTab">
      <v-tabs-bar class="main-tabs">
        <v-tabs-slider color="primary" />
        <v-tabs-item href="#base">
          <icon name="base-layer" />
          Base Layers
        </v-tabs-item>
        <v-tabs-item href="#overlays">
          <icon name="overlays" />
          Overlay Layers
        </v-tabs-item>
        <v-tabs-item href="#legend">
          <icon name="legend" />
          Legend
        </v-tabs-item>
      </v-tabs-bar>
      <v-tabs-items>

        <v-tabs-content id="base">
          <scroll-area>
            <v-radio-group
              v-model="visibleBaseLayer"
              :mandatory="false"
              hide-details>
              <v-radio
                v-for="(layer, index) in baseLayers.list"
                :key="index"
                :label="layer.title || layer.name"
                :value="layer.name"
                color="primary"
                @change="updateBaseLayerVisibility">
              </v-radio>
            </v-radio-group>
          </scroll-area>
        </v-tabs-content>

        <v-tabs-content id="overlays">
          <v-tabs centered v-model="activeSecondaryTab">
            <v-tabs-bar class="secondary-tabs">
              <v-tabs-item href="#topics">
                Topics
              </v-tabs-item>
              <v-tabs-item href="#layers">
                Layers
              </v-tabs-item>
            </v-tabs-bar>
            <v-tabs-items>
              <v-tabs-content id="topics">
                <v-radio-group
                  v-model="activeTopicIndex"
                  hide-details>
                  <v-radio
                    v-for="(topic, index) in overlays.topics"
                    :key="index"
                    :label="topic.title"
                    :value="index"
                    color="primary"
                    @change="setTopic">
                  </v-radio>
                </v-radio-group>
              </v-tabs-content>
              <v-tabs-content id="layers">
                <scroll-area>
                  <LayerItem
                    v-for="layer in overlays.tree"
                    :key="layer.name"
                    :layer="layer"
                    :expanded="expandedLayerItem"
                    :depth="1"
                    @changed:visibility="updateLayersVisibility"
                    @expanded="expanded" />
                </scroll-area>

              </v-tabs-content>
            </v-tabs-items>
          </v-tabs>
        </v-tabs-content>

        <v-tabs-content id="legend">
          <scroll-area class="legend-container">
            <Legend :layers="visibleLayers" :visible="activeMainTab === 'legend'"/>
          </scroll-area>
        </v-tabs-content>

      </v-tabs-items>
    </v-tabs>
  </div>
</template>

<script>
import { layersList, groupLayers } from '../../map-builder'
import LayerItem from './LayerItem'
import Legend from './Legend'
import ScrollArea from '../ScrollArea'

export default {
  name: 'content-panel',
  components: { LayerItem, Legend, ScrollArea },
  props: ['baseLayers', 'overlays'],
  inject: ['$map'],
  data () {
    return {
      visibleLayers: [],
      activeTopicIndex: null,
      visibleBaseLayer: '',
      activeMainTab: 'overlays',
      activeSecondaryTab: 'layers',
      expandedLayerItem: ''
    }
  },
  created () {
    this.groups.forEach(l => { this.$set(l, 'visible', true) })
    this.overlays.list.forEach(l => { this.$set(l, '_visible', l.visible) })

    const visibleBaseLayer = this.baseLayers.list.find(l => l.visible)
    if (visibleBaseLayer) {
      this.visibleBaseLayer = visibleBaseLayer.name
    }
    this.updateLayersVisibility()
  },
  computed: {
    groups () {
      return layersList(this.overlays.tree, false).filter(l => l.isGroup)
    }
  },
  methods: {
    setTopic (index) {
      const visibleLayers = this.overlays.topics[index].visible_overlays

      this.overlays.list.forEach(l => { l._visible = visibleLayers.includes(l.name) })
      this.updateLayersVisibility()
    },
    updateBaseLayerVisibility (visibleBaseLayer) {
      this.$map.getLayers().getArray()
        .filter(l => l.get('type') === 'baselayer')
        .forEach(l => l.setVisible(l.get('name') === visibleBaseLayer))
    },
    updateLayersVisibility () {
      this.activeTopicIndex = null

      // layers of hidden groups
      const excluded = this.groups
        .filter(l => !l.visible)
        .reduce((values, layer) => {
          return values.concat(groupLayers(layer).map(l => l.name))
        }, [])

      this.overlays.list.forEach(l => {
        l.visible = (l.hidden || l._visible) && !excluded.includes(l.name)
      })
      this.visibleLayers = this.overlays.list.filter(l => l.visible)

      this.$map.overlay.getSource().setVisibleLayers(this.visibleLayers.map(l => l.name))
    },
    expanded (id) {
      this.expandedLayerItem = this.expandedLayerItem !== id ? id : ''
    }
  }
}
</script>

<style lang="scss">
@import '../../theme.scss';

.layers-list {
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 280px;
  background-color: #fff;
  border-right: 1px solid #aaa;
  display: flex;
  flex-direction: column;

  box-shadow:
    0 6px 6px -3px rgba(0,0,0,.2),
    0 10px 14px 1px rgba(0,0,0,.14),
    0 4px 18px 3px rgba(0,0,0,.12);
  .input-group {
    padding-top: 0;
  }

  /* For proper scrolling */
  .tabs {
    flex: 1 1;
    display: flex;
    flex-direction: column;
    .tabs__items {
      flex: 1 1;
      display: flex;
      flex-direction: column;
      .tabs__content {
        display: flex;
        flex-direction: column;
        flex: 1 1;
        overflow-y: auto;
      }
    }
  }

  h4 {
    text-transform: uppercase;
    font-size: 90%;
  }

  .main-tabs {
    height: 3.5em;
    .tabs__li {
      width: 33%;
      font-size: 0.75rem;
      position: relative;
      .tabs__item {
        padding: 0;
        text-transform: none;
        font-weight: 500;
        &.tabs__item--active {
          color: $primary-color!important;
        }

        .icon {
          width: 20px;
          height: 20px;
          fill: currentColor;
        }
      }
      &:not(:last-child):after {
        content: "";
        position: absolute;
        right: 0;
        top: 20%;
        bottom: 45%;
        width: 1px;
        background-color: #aaa;
      }
    }
  }
  .secondary-tabs {
    height: 3em;
    .tabs__li {
      .tabs__item {
        margin: 0.5em 0;
        height: 2.5em;
        text-transform: none;
        font-size: 0.75em;
        &.tabs__item--active {
          color: #fff!important;
          background-color: $primary-color;
          font-weight: 600;
        }
      }
    }
  }

  .legend-container {
    img {
      display: block;
    }
  }
}
</style>
