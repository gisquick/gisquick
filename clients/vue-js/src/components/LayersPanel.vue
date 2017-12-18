<template>
  <div class="layers-menu">

    <h4>Topics</h4>
    <div v-for="(topic, index) in topics">
      <input
        type="radio"
        name="topic"
        :value="index"
        :id="'topic-'+index"
        v-model="activeTopicIndex"
        @change="setTopic">
        <label :for="'topic-'+index">{{ topic.title }}</label>
    </div>
    <hr />

    <h4>Base Layers</h4>
    <div v-for="(layer, index) in baseLayers">
      <input
        type="radio"
        name="baselayer"
        :value="layer.name"
        :id="'baselayer-'+index"
        v-model="visibleBaseLayer"
        @change="updateBaseLayerVisibility">
      <label :for="'baselayer-'+index">{{ layer.title || layer.name }}</label>
    </div>
    <hr />

    <h4>Overlay Layers</h4>
    <div v-for="(layer, index) in layersList">
      <div v-if="layer.layers" class="item group">
        {{ layer.title }}
      </div>
      <div v-else class="item">
        <input
          type="checkbox"
          :id="'layer-'+index"
          v-model="layer.visible"
          @change="updateLayersVisibility">
        <label :for="'layer-'+index">{{ layer.title || layer.name }}</label>
      </div>
    </div>
    <hr />

    <div class="legend-container">
      <h4>Legend</h4>
      <img
        v-for="url in legendList"
        :src="url"
        alt="" >
    </div>
  </div>
</template>

<script>
import { layersList } from '../map-builder'

export default {
  name: 'layers',
  props: [
    'topics',
    'baseLayers',
    'layers'
  ],
  data () {
    return {
      activeTopicIndex: null,
      visibleBaseLayer: ''
    }
  },
  created () {
    const visibleBaseLayer = this.baseLayers.find(l => l.visible)
    if (visibleBaseLayer) {
      this.visibleBaseLayer = visibleBaseLayer.name
    }
  },
  computed: {
    layersList () {
      return layersList(this.layers, false)
    },
    legendList () {
      const source = this.$root.map.overlay.getSource()
      const view = this.$root.map.getView()
      return this.layersList
        .filter(l => !l.isGroup && l.visible)
        .map(l => source.getLegendUrl(l.name, view))
    }
  },
  methods: {
    setTopic () {
      const visibleLayers = this.topics[this.activeTopicIndex].visible_overlays
      // update model
      this.layersList.forEach(l => { l.visible = visibleLayers.indexOf(l.name) !== -1 })
      // update map
      this.$root.map.overlay.getSource().setVisibleLayers(visibleLayers)
    },
    updateBaseLayerVisibility () {
      this.$root.map.getLayers().getArray()
        .filter(l => l.get('type') === 'baselayer')
        .forEach(l => l.setVisible(l.get('name') === this.visibleBaseLayer))
    },
    updateLayersVisibility () {
      this.activeTopicIndex = null
      const visibleLayers = this.layersList.filter(l => !l.isGroup && l.visible).map(l => l.name)
      this.$root.map.overlay.getSource().setVisibleLayers(visibleLayers)
    }
  }
}
</script>

<style lang="scss">
.layers-menu {
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  overflow: auto;
  width: 280px;
  background-color: #fff;
  border-right: 1px solid #aaa;
  h4 {
    margin: 0.5em 0.25em;
  }
  .item {
    padding: 0.25em;
    input {
      outline: none;
      border: none;
    }
    &.group {
      font-weight: 500;
      background-color: #ECEFF1;
    }
  }
  .legend-container {
    img {
      display: block;
    }
  }
}
</style>
