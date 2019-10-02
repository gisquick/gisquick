<template>
  <div>
    <portal to="main-panel">
      <div class="print-form pa-2" key="print">
        <v-select
          v-model="layout"
          :label="tr.Layout"
          item-text="name"
          :return-object="true"
          :items="layouts"
          hide-details
        />
        <v-menu bottom left content-class="print">
          <v-btn icon slot="activator">
            <v-icon>more_vert</v-icon>
          </v-btn>
          <v-list>

            <text-separator>
              <translate>Output format</translate>
            </text-separator>
            <v-list-tile
              v-for="value in ['pdf', 'png']"
              :key="value"
              class="checkable"
              @click="format = value"
            >
              <v-icon class="check" v-show="format === value">
                check
              </v-icon>
              <v-list-tile-title>{{ value }}</v-list-tile-title>
            </v-list-tile>

            <text-separator>
              <translate>Print quality</translate>
            </text-separator>
            <v-list-tile
              v-for="value in [96, 150, 300]"
              :key="value"
              class="checkable"
              @click="dpi = value"
            >
              <v-icon class="check" v-show="dpi === value">
                check
              </v-icon>
              <v-list-tile-title>{{ value }} dpi</v-list-tile-title>
            </v-list-tile>
          </v-list>
        </v-menu>

        <collapse-transition>
          <form v-if="layout">
            <switch-transition>
              <v-layout column :key="layout.name">
                <v-text-field
                  v-for="label in visibleLabels"
                  :key="label"
                  :label="label"
                  :name="label"
                  v-model="labelsData[layout.name][label]"
                  hide-details
                />
              </v-layout>
            </switch-transition>
          </form>
        </collapse-transition>
      </div>
    </portal>
    <portal to="map-overlay">
      <print-preview
        v-if="showPreview"
        :layout="layout"
        :format="format"
        :dpi="dpi"
        :labels-data="labelsData"
        @close="$emit('close')"
      />
    </portal>
  </div>
</template>

<script>
import { mapState } from 'vuex'
import PrintPreview from './Preview'

let state = null

export default {
  name: 'print',
  components: { PrintPreview },
  data: () => state || ({
    layout: null,
    format: 'png',
    dpi: 96,
    labelsData: null,
    showPreview: false
  }),
  computed: {
    ...mapState(['project']),
    layouts () {
      return this.project.config.print_composers
    },
    visibleLabels () {
      if (this.layout) {
        return this.layout.labels.filter(label => !label.startsWith('gislab_'))
      }
      return []
    },
    tr () {
      return {
        Layout: this.$gettext('Layout')
      }
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
  display: flex;
  flex-direction: column;

  > .v-menu {
    position: absolute;
    right: 0;
    top: 0;
    .v-menu__activator .v-btn {
      color: #aaa;
      margin: 0;
    }
  }

  .v-input {
    padding-bottom: 2px;
  }
}
</style>
