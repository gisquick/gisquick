<template>
  <div
    class="layers-tree f-col"
  >
    <template v-for="(topic, index) in topics">
    <div
      :key="index"
      class="item layer f-row-ac"
      :class="{expanded: expandedItem === topic}"
    >
      <v-radio-btn
        class="f-grow"
        :label="topic.title"
        :val="index"
        :value="activeTopicIndex"
        @input="setTopic"
      />
      <v-btn class="icon flat small" @click="toggleDetail(topic)">
        <v-icon
          class="toggle"
          name="arrow-down"
          size="12"
        />
        <!-- <v-icon
          class="toggle"
          name="arrow-down2"
          size="16"
        /> -->
      </v-btn>
    </div>
    <collapse-transition :key="`detail-${index}`">
      <div
        v-if="expandedItem === topic"
        class="metadata px-2 py-1"
      >
        <translate class="label">Abstract</translate>
        <span>{{ topic.abstract }}</span>
      </div>
    </collapse-transition>
    </template>
  </div>
</template>

<script lang="js">
import { mapState } from 'vuex'
import difference from 'lodash/difference'

export default {
  data () {
    return {
      expandedItem: null
    }
  },
  computed: {
    ...mapState(['project']),
    hiddenLayers () {
      return this.project.overlays.list.filter(l => l.hidden).map(l => l.name)
    },
    topics () {
      return this.project.config.topics
      const { topics } = this.project.config
      return topics.map(t => ({
        ...t,
        visible_overlays: t.visible_overlays.filter(n => !this.hiddenLayers.includes(n))
      }))
    },
    activeTopic () {
      // this ignores layers in hidden groups
      const visibleLayers = this.project.overlays.list.filter(l => l.visible && !l.hidden).map(l => l.name)
      return this.topics.find(t => t.visible_overlays.length === visibleLayers.length && difference(t.visible_overlays, visibleLayers).length === 0)
    },
    activeTopicIndex () {
      return this.topics.indexOf(this.activeTopic)
    }
  },
  methods: {
    toggleDetail (item) {
      this.expandedItem = this.expandedItem !== item ? item : null
    },
    setTopic (index) {
      this.$store.commit('visibleLayers', this.topics[index].visible_overlays)
    }
  }
}
</script>

<style lang="scss" scoped>
@import './layers-tree.scss';
</style>
