<template>
  <div class="content-panel">
    <v-toolbar dark flat height="30">
      <v-spacer></v-spacer>
      <h4>Content</h4>
      <v-spacer></v-spacer>
    </v-toolbar>
    <v-tabs icons-and-text
      v-model="activeMainTab">
      <v-tabs-slider color="primary" />
      <v-tab href="#base">
        <span>Base Layers</span>
        <icon name="base-layer" />
      </v-tab>
      <v-tab href="#overlays">
        <span>Overlay Layers</span>
        <icon name="overlays" />
      </v-tab>
      <v-tab href="#legend">
        <span>Legend</span>
        <icon name="legend" />
      </v-tab>

      <v-tab-item id="base">
        <scroll-area>
          <v-radio-group
            v-model="visibleBaseLayer"
            :mandatory="false"
            hide-details>
            <baselayer-item
              v-for="(layer, index) in baseLayers.list"
              :key="index"
              :layer="layer"
              :expanded="expandedItems.baselayer"
              @expanded="id => expandItem('baselayer', id)"
              @changed:visibility="updateBaseLayerVisibility" />
          </v-radio-group>
        </scroll-area>
      </v-tab-item>

      <v-tab-item id="overlays">
        <v-tabs
          grow
          :hide-slider="true"
          class="secondary-tabs"
          v-model="activeSecondaryTab">
          <v-tab href="#topics">Topics</v-tab>
          <v-tab href="#layers">Layers</v-tab>
          <v-tab-item id="topics">
            <scroll-area>
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
            </scroll-area>
          </v-tab-item>
          <v-tab-item id="layers">
            <scroll-area>
              <layer-item
                v-for="layer in overlays.tree"
                :key="layer.name"
                :layer="layer"
                :expanded="expandedItems.overlay"
                :depth="1"
                @changed:visibility="updateLayersVisibility"
                @expanded="id => expandItem('overlay', id)">
                <div
                  slot="custom"
                  slot-scope="props"
                  :is="customSlot.component"
                  :layer="props.layer"
                  v-bind="customSlot.props"
                />
              </layer-item>
            </scroll-area>
          </v-tab-item>
        </v-tabs>
      </v-tab-item>

      <v-tab-item id="legend">
        <scroll-area class="legend-container">
          <map-legend
            :layers="visibleLayers"
            :visible="activeMainTab === 'legend'" />
        </scroll-area>
      </v-tab-item>

    </v-tabs>
  </div>
</template>

<script>
import { layersList, groupLayers } from '../../map-builder'
import LayerItem from './LayerItem'
import BaseLayerItem from './BaseLayerItem'
import MapLegend from './Legend'

export default {
  name: 'content-panel',
  components: { BaseLayerItem, LayerItem, MapLegend },
  props: ['baseLayers', 'overlays'],
  inject: ['$map'],
  data: () => ({
    visibleLayers: [],
    activeTopicIndex: null,
    visibleBaseLayer: '',
    activeMainTab: 'overlays',
    activeSecondaryTab: 'layers',
    expandedItems: {
      baselayer: '',
      overlay: ''
    },
    customSlot: {}
  }),
  created () {
    this.$root.$panel.setLayerCustomComponent = (component, props) => {
      this.setCustomComponent(component, props)
    }
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
    expandItem (group, id) {
      this.expandedItems[group] = this.expandedItems[group] !== id ? id : ''
    },
    setCustomComponent (component, props) {
      this.customSlot = {component, props}
    }
  }
}
</script>

<style lang="scss">
@import '../../theme.scss';

.content-panel {
  flex-grow: 1;
  display: flex;
  flex-direction: column;

  .v-input-group {
    padding-top: 0;
  }

  /* For proper scrolling */
  .v-tabs {
    flex: 1 1;
    display: flex;
    flex-direction: column;
    .v-tabs__items {
      flex: 1 1;
      display: flex;
      flex-direction: column;
      .v-tabs__content {
        display: flex;
        flex-direction: column;
        flex: 1 1;
        overflow-y: auto;
      }
    }
  }

  .secondary-tabs {
    .v-tabs__bar {
      margin: 0 0.25em;
    }
    .v-tabs__div {
      &:first-child {
        .v-tabs__item {
          border-top-left-radius: 0.5em;
          border-bottom-left-radius: 0.5em;
          border-width: 1px 0 1px 1px;
        }
      }
      &:last-child {
        .v-tabs__item {
          border-top-right-radius: 0.5em;
          border-bottom-right-radius: 0.5em;
          border-width: 1px 1px 1px 0;
        }
      }
      .v-tabs__item {
        margin: 0.5em 0;
        height: 2.25em;
        text-transform: none;
        font-size: 0.875em;
        border: 1px solid #bbb;

        &.v-tabs__item--active {
          color: #fff!important;
          background-color: $primary-color;
          font-weight: 600;
          border-color: darken($primary-color, 8%);
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
