<template>
  <div>
    <portal to="main-panel">
      <div class="print-form f-col light" key="print">
        <div class="f-row">
          <v-select
            class="flat f-grow"
            :label="tr.Layout"
            v-model="layout"
            :placeholder="tr.Layout"
            item-text="name"
            item-value=""
            :items="layouts"
          />
          <v-menu
            :aria-label="tr.Menu"
            transition="slide-y"
            align="rr;bb,tt"
            content-class="print"
            :items="menuItems"
          >
            <template v-slot:activator="{ toggle }">
              <v-btn :aria-label="tr.Menu" class="icon small" @click="toggle">
                <v-icon name="menu-dots"/>
              </v-btn>
            </template>
          </v-menu>
        </div>

        <collapse-transition>
          <form v-if="layout">
            <switch-transition>
              <div class="f-col" :key="layout.name">
                <v-text-field
                  v-for="label in visibleLabels"
                  :key="label"
                  class="flat"
                  :placeholder="label"
                  :name="label"
                  :label="label"
                  v-model="labelsData[layout.name][label]"
                />
              </div>
            </switch-transition>
          </form>
        </collapse-transition>
      </div>
    </portal>
    <portal to="map-overlay">
      <print-preview
        v-if="layout && showPreview"
        :layout="layout"
        :format="format"
        :dpi="dpi"
        :labels-data="labelsData"
        :draw-measurements="hasMeasurements"
        @close="$emit('close')"
      />
    </portal>
  </div>
</template>

<script lang="js">
import { mapState } from 'vuex'
import PrintPreview from './Preview.vue'

let state = null

export default {
  name: 'print',
  components: { PrintPreview },
  props: {
    measure: Object
  },
  data: () => state || ({
    layout: null,
    format: 'pdf',
    dpi: 96,
    labelsData: null,
    showPreview: false
  }),
  computed: {
    ...mapState(['project']),
    tr () {
      return {
        Menu: this.$gettext('Menu'),
        Layout: this.$gettext('Layout')
      }
    },
    formatMenuItems () {
      const action = i => {
        this.format = i.value
      }
      return ['pdf', 'png'].map(value => ({
        value,
        text: value,
        checked: this.format === value,
        action
      }))
    },
    qualityMenuItems () {
      const action = i => {
        this.dpi = i.value
      }
      return [96, 150, 300].map(value => ({
        value,
        text: `${value} dpi`,
        checked: this.dpi === value,
        action
      }))
    },
    menuItems () {
      return [
        { text: this.$gettext('Output format'), separator: true },
        ...this.formatMenuItems,
        { text: this.$gettext('Print quality'), separator: true },
        ...this.qualityMenuItems
      ]
    },
    layouts () {
      return this.project.config.print_composers
    },
    visibleLabels () {
      if (this.layout) {
        return this.layout.labels.filter(label => !label.startsWith('gislab_'))
      }
      return []
    },
    hasMeasurements () {
      if (this.measure.state?.tools) {
        return Object.values(this.measure.state.tools).some(tool => tool.items.length > 0)
      }
      return false
    }
  },
  created () {
    this.showPreview = false
    // wait some time before showing preview to avoid possible resizing during closing of previous tool
    setTimeout(() => {
      this.showPreview = true
    }, 500)
    if (!this.labelsData) {
      // initialize data for all labels
      const labelsdata = {}
      this.layouts.forEach(layout => {
        labelsdata[layout.name] = {}
        layout.labels
          .filter(label => !label.startsWith('gislab_'))
          .forEach(label => {
            labelsdata[layout.name][label] = ''
          })
      })
      this.labelsData = labelsdata
    }
    this.layout = this.layout || this.layouts[0]
  },
  mounted () {
    this.activate()
  },
  activated () {
    this.activate()
  },
  beforeDestroy () {
    this.deactivate()
    state = this.$data
  },
  deactivated () {
    this.deactivate()
  },
  methods: {
    activate () {
      this.$root.$panel.setStatusBarVisible(false)
    },
    deactivate () {
      this.$root.$panel.setStatusBarVisible(true)
    }
  }
}
</script>

<style lang="scss">
.print-form {
  .menu {
    .btn {
      margin: 4px;
    }
  }
}
</style>
