<template>
  <div class="content-panel">
    <v-toolbar dark flat height="30">
      <v-spacer/>
      <h4><translate>Content</translate></h4>
      <v-spacer/>
    </v-toolbar>
    <v-tabs
      icons-and-text
      v-model="activeMainTab"
    >
      <v-tabs-slider color="primary"/>
      <v-tab href="#base">
        <translate>Base Layers</translate>
        <icon name="base-layer"/>
      </v-tab>
      <v-tab href="#overlays">
        <translate>Overlay Layers</translate>
        <icon name="overlays"/>
      </v-tab>
      <v-tab href="#legend">
        <translate>Legend</translate>
        <icon name="legend"/>
      </v-tab>

      <v-tab-item id="base">
        <scroll-area>
          <base-layer-opacity class="opacity-tool mx-1 px-1 mt-2"/>
          <v-radio-group
            :value="visibleBaseLayerName"
            :mandatory="false"
            hide-details
          >
            <base-layer-item
              v-for="(layer, index) in project.baseLayers.list"
              :key="index"
              :layer="layer"
              :expanded="expandedItems.baselayer"
              @expanded="id => expandItem('baselayer', id)"
              @change="setBaseLayer"
            />
          </v-radio-group>
        </scroll-area>
      </v-tab-item>

      <v-tab-item id="overlays">
        <overlays-opacity class="opacity-tool mx-1 px-1 mt-2"/>
        <v-tabs
          grow
          :hide-slider="true"
          class="secondary-tabs"
          v-model="activeSecondaryTab"
        >
          <v-tab href="#topics">
            <translate>Topics</translate>
          </v-tab>
          <v-tab href="#layers">
            <translate>Layers</translate>
          </v-tab>
          <v-tab-item id="topics">
            <scroll-area>
              <v-radio-group
                :value="activeTopicIndex"
                hide-details
              >
                <div
                  class="item-container"
                  v-for="(topic, index) in topics"
                  :key="index"
                >
                  <div class="item layout row">
                    <v-radio
                      :label="topic.title"
                      :value="index"
                      color="primary"
                      class="flex"
                      @change="setTopic"
                    />
                  </div>
                </div>
              </v-radio-group>
            </scroll-area>
          </v-tab-item>
          <v-tab-item id="layers">
            <scroll-area>
              <layer-item
                v-for="layer in project.overlays.tree"
                :key="layer.name"
                :layer="layer"
                :expanded="expandedItems.overlay"
                :depth="1"
                @expanded="id => expandItem('overlay', id)"
              />
            </scroll-area>
          </v-tab-item>
        </v-tabs>
      </v-tab-item>

      <v-tab-item id="legend">
        <scroll-area class="legend-container">
          <map-legend :visible="activeMainTab === 'legend'"/>
        </scroll-area>
      </v-tab-item>

    </v-tabs>
  </div>
</template>

<script>
import difference from 'lodash/difference'
import { mapState, mapGetters } from 'vuex'
import LayerItem from './LayerItem'
import BaseLayerItem from './BaseLayerItem'
import MapLegend from './Legend'
import OverlaysOpacity from './OverlaysOpacity'
import BaseLayerOpacity from './BaseLayerOpacity'

export default {
  name: 'content-panel',
  components: { BaseLayerItem, LayerItem, MapLegend, OverlaysOpacity, BaseLayerOpacity },
  data () {
    return {
      activeMainTab: 'overlays',
      activeSecondaryTab: 'layers',
      expandedItems: {
        baselayer: '',
        overlay: ''
      }
    }
  },
  computed: {
    ...mapState(['project']),
    ...mapGetters(['visibleBaseLayer', 'visibleLayers']),
    visibleBaseLayerName () {
      return this.visibleBaseLayer && this.visibleBaseLayer.name
    },
    topics () {
      return this.project.config.topics
    },
    activeTopic () {
      // this ignores layers in not visible groups
      // const visibleLayers = this.visibleLayers.filter(l => !l.hidden).map(l => l.name)

      const visibleLayers = this.project.overlays.list.filter(l => l.visible && !l.hidden).map(l => l.name)
      return this.topics.find(t => t.visible_overlays.length === visibleLayers.length && difference(t.visible_overlays, visibleLayers).length === 0)
    },
    activeTopicIndex () {
      return this.topics.indexOf(this.activeTopic)
    }
  },
  methods: {
    setBaseLayer (baseLayer) {
      this.$store.commit('visibleBaseLayer', baseLayer.name)
    },
    setTopic (index) {
      this.$store.commit('visibleLayers', this.topics[index].visible_overlays)
    },
    expandItem (group, id) {
      this.expandedItems[group] = this.expandedItems[group] !== id ? id : ''
    }
  }
}
</script>

<style lang="scss">
@import '../../theme.scss';

.content-panel {
  flex: 1 1;
  display: flex;
  flex-direction: column;
  max-height: 100%;

  .v-input-group {
    padding-top: 0;
  }

  /* For proper scrolling */
  .v-tabs {
    flex: 1 1;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    .v-tabs__items {
      flex: 1 1;
      display: flex;
      flex-direction: column;
      .v-tabs__content {
        display: flex;
        flex-direction: column;
        flex: 1 1 auto;
        overflow-y: auto;
        // overflow: hidden;
        max-height: 100%;
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

  .item-container {
    .item {
      position: relative;

      &:hover {
        background-color: #eee;
      }
      .v-input {
        margin-top: 0;
      }
      .v-radio {
        label {
          flex-grow: 1;
        }
      }
    }
  }

  .legend-container {
    img {
      display: block;
    }
  }
  .opacity-tool {
    background-color: #e7e7e7;
  }
}
</style>
