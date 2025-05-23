<template>
  <div class="content-panel light">
    <div class="panel-header f-row-ac f-justify-center">
      <translate class="title">Content</translate>
    </div>
    <v-tabs-header :items="tabsItems" v-model="activeMainTab"/>
    <v-tabs class="f-grow" :items="tabsItems" v-model="activeMainTab">
      <template v-slot:base>
        <scroll-area>
          <base-layer-opacity
            class="opacity-tool toolbar"
            @touchstart.native.stop=""
            @touchend.native.stop=""
          />
          <base-layers-tree
            class="mt-2"
            :layers="project.baseLayers.tree"
            :collapsed.sync="collapsedBaseLayers"
            :value="visibleBaseLayerName"
            @input="setBaseLayer"
          />
        </scroll-area>
      </template>
      <template v-slot:overlays>
        <overlays-opacity
          class="opacity-tool toolbar"
          @touchstart.native.stop=""
          @touchend.native.stop=""
        />
        <text-tabs-header v-if="overlaysTabs.length > 1" :items="overlaysTabs" v-model="activeSecondaryTab"/>
        <v-tabs
          class="secondary-tabs f-grow"
          :items="overlaysTabs"
          v-model="activeSecondaryTab"
        >
          <template v-slot:topics>
            <scroll-area>
              <topics-list/>
            </scroll-area>
          </template>
          <template v-slot:layers>
            <scroll-area>
              <div class="searchbar f-row f-align-end">
                <v-btn
                  class="icon flat p-1"
                  :color="filterMode ? 'primary' : ''"
                  @click="toggleFilterMode">
                  <v-icon name="filter"/>
                </v-btn>
                <v-text-field
                  class="filled f-grow"
                  :placeholder="filterMode ? tr.FilterPlaceholder : tr.SearchPlaceholder"
                  v-model="filterText"
                  @input="findLayersTree"
                  @keydown.enter="findLayersTree(filterText)"
                >
                  <template v-slot:append>
                    <v-btn v-if="filterText" class="icon flat" @click="[filterText = '', highlight = null]">
                      <v-icon name="x"/>
                    </v-btn>
                    <v-icon v-else name="magnifier" class="mx-2"/>
                  </template>
                </v-text-field>
              </div>
              <layers-tree
                class="light group-visibility-mode-0"
                :highlight="highlight"
                :attribute-table-disabled="attributeTableDisabled"
                :layers="project.overlays"
                :filter="filterMode ? filterText : ''"
                :collapsed.sync="collapsedOverlays"
              />
            </scroll-area>
          </template>
        </v-tabs>
      </template>
      <template v-slot:legend="{ visible }">
        <scroll-area class="legend-container">
          <map-legend :visible="visible"/>
        </scroll-area>
      </template>
    </v-tabs>
  </div>
</template>

<script>
import { mapState, mapGetters } from 'vuex'

import VTabs from '@/ui/Tabs.vue'
import VTabsHeader from '@/ui/TabsHeader.vue'
import TextTabsHeader from '@/ui/TextTabsHeader.vue'
import BaseLayerOpacity from './BaseLayerOpacity.vue'
import OverlaysOpacity from './OverlaysOpacity.vue'
import BaseLayersTree from './BaseLayersTree.vue'
import LayersTree from './LayersTree.vue'
import TopicsList from './TopicsList.vue'
import MapLegend from './Legend.vue'
import { textMatcher } from '@/ui/utils/text'


export default {
  name: 'content-panel',
  components: { VTabs, VTabsHeader, TextTabsHeader, MapLegend, OverlaysOpacity, BaseLayerOpacity, LayersTree, BaseLayersTree, TopicsList },
  props: {
    attributeTableDisabled: Boolean
  },
  data () {
    return {
      activeMainTab: 'overlays',
      activeSecondaryTab: '',
      collapsedBaseLayers: [],
      collapsedOverlays: [],
      filterText: '',
      filterMode: true,
      searchContext: {
        text: '',
        index: -1,
        matches: []
      },
      highlight: null
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
    hasTopics () {
      return this.topics?.length > 0
    },
    hasBaseLayers () {
      return this.project.baseLayers.list.length > 0
    },
    tabsItems () {
      return [
        this.hasBaseLayers && { key: 'base', icon: 'base-layer', label: this.$gettext('Base Layers') },
        { key: 'overlays', icon: 'overlays', label: this.$gettext('Overlay Layers') },
        { key: 'legend', icon: 'legend', label: this.$gettext('Legend') }
      ].filter(i => i)
    },
    overlaysTabs () {
      return [
        this.hasTopics && { key: 'topics', label: this.$gettext('Topics') },
        { key: 'layers', label: this.$gettext('Layers') }
      ].filter(i => i)
    },
    layersSearchItems () {
      const list = []
      const collect = (items, parents=[]) => {
        items.forEach((n, i) => {
          if (n.layers) {
            list.push({ text: n.name, index: i, group: n, parents })
            if (!n.virtual_layer) {
              collect(n.layers, [...parents, n])
            }
          } else {
            list.push({ text: n.title, layer: n, index: i, parents })
          }
        })
      }
      collect(this.project.overlays.tree)
      return list
    },
    tr () {
      return {
        FilterPlaceholder: this.$gettext('Filter layers'),
        SearchPlaceholder: this.$gettext('Find a layer')
      }
    }
  },
  created () {
    this.activeSecondaryTab = this.topics?.length ? 'topics' : 'layers'
  },
  watch: {
    project: {
      immediate: true,
      handler (project) {
        this.collapsedOverlays = project.overlays.groups.filter(g => g.collapsed || g.virtual_layer).map(g => g.id)
        this.collapsedBaseLayers = project.baseLayers.groups.filter(g => g.collapsed || g.virtual_layer).map(g => g.id)
      }
    }
  },
  methods: {
    setBaseLayer (name) {
      this.$store.commit('visibleBaseLayer', name)
    },
    async highlightResult () {
      const match = this.searchContext.matches[this.searchContext.index]
      if (match) {
        const collapsed = match.parents.filter(g => this.collapsedOverlays.includes(g.id)).map(g => g.id)
        if (collapsed.length) {
          this.collapsedOverlays = this.collapsedOverlays.filter(n => !collapsed.includes(n))
          // await new Promise(resolve => this.$nextTick(resolve))
          await new Promise(resolve => setTimeout(resolve, 450)) // wait for expand animation
        }
        if (match.layer) {
          this.highlight = {
            layer: match.layer,
            html: match.html
          }
        } else {
          this.highlight = {
            group: match.group,
            html: match.html
          }
        }
      } else {
        this.highlight = null
      }
    },
    findLayersTree (text) {
      if (!this.filterMode && text.length > 1) {
        if (this.searchContext.text !== text) {
          const m = textMatcher(text)
          const res = this.layersSearchItems.filter(i => m.test(i.text))
          const htmls = res.map(match => m.highlight(match.text))
          this.searchContext = { text, index: 0, matches: res.map((r, i) => ({ ...r, html: htmls[i] })) }
          this.highlightResult()
        } else {
          const index = this.searchContext.index + 1
          this.searchContext.index = index >= this.searchContext.matches.length ? 0 : index
          this.highlightResult()
        }
      } else {
        this.highlight = null
      }
    },
    toggleFilterMode () {
      this.filterMode = !this.filterMode
      if (!this.filterMode && this.filterText) {
        this.findLayersTree(this.filterText)
      }
    }
  }
}
</script>

<style lang="scss" scoped>
.content-panel {
  flex: 1 1;
  display: flex;
  flex-direction: column;
  max-height: 100%;

  .tabs {
    font-size: 15px;
  }
  .opacity-tool {
    background-color: #eee;
    padding: 4px 6px 2px 6px;
  }
  .searchbar {
    --gutter: 0 2px;
    padding: 0 3px 3px 0;
    .text-field ::v-deep .input {
      font-size: 14px;
      height: 26px;
    }
  }
  @media (min-height: 601px) {
    .searchbar {
      position: sticky;
      top: 0;
      background-color: #fff;
      z-index: 2;
    }
    :deep .scrollbar-track.vertical {
      margin-top: 31px;
    }
  }
}
</style>
