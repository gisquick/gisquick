<template>
  <div>
    <portal to="main-panel-top">
      <collapse-transition class="collapsible">
        <div v-if="activeToolPanelVisible" class="f-col">
          <div v-if="showHeader" class="panel-header f-row-ac dark">
            <span class="f-grow"/>
            <span class="title">{{ activeToolObj.title }}</span>
            <div class="actions f-grow f-row-ac f-justify-end">
              <!-- <v-icon size="18" class="mx-2" name="settings"/> -->
              <v-btn
                class="icon dense"
                @click="onClose"
              >
                <v-icon name="x"/>
              </v-btn>
            </div>
          </div>
          <portal-target name="main-panel" transition="switch-transition"/>
        </div>
      </collapse-transition>
    </portal>
    <div
      v-if="activeToolObj && activeToolObj.component"
      :is="activeToolObj.component"
      v-bind.sync="activeToolObj.data"
      @close="$store.commit('activeTool', null)"
    />
  </div>
</template>

<script lang="jsx">
import { mapState } from 'vuex'

import AttributesTable from '@/components/AttributesTable.vue'
import Identification from '@/components/Identification.vue'
import Measure from '@/components/measure/Measure.vue'
import Print from '@/components/print/Print.vue'
import MobileAttributesTable from '@/components/MobileAttributesTable.vue'

export default {
  props: {
    showHeader: Boolean,
    hiddenIdentification: Boolean,
    mobile: Boolean
  },
  data () {
    return {
      identificationSettings: {
        identificationLayer: '',
        displayMode: 'both'
      },
      measureSettings: {
        type: 'location',
        state: null
      }
    }
  },
  computed: {
    ...mapState(['project', 'activeTool']),
    identificationTool () {
      return {
        name: 'identification',
        title: this.$pgettext('noun', 'Identification'),
        icon: 'identification',
        data: this.identificationSettings,
        component: Identification
      }
    },
    hiddenIdentificationTool () {
      return {
        name: 'hidden-identification',
        data: this.identificationSettings,
        component: Identification
      }
    },
    measureTool () {
      return {
        name: 'measure',
        title: this.$pgettext('noun', 'Measure'),
        icon: 'ruler',
        component: Measure,
        data: this.measureSettings
      }
    },
    printTool () {
      return {
        name: 'print',
        title: this.$pgettext('noun', 'Print'),
        icon: 'printer',
        component: Print,
        disabled: !this.project.config.print_composers || this.project.config.print_composers.length < 1,
        data: {
          measure: this.measureSettings
        }
      }
    },
    attributeTableTool () {
      if (this.mobile) {
        return {
          name: 'attribute-table',
          title: this.$gettext('Attributes Table'),
          icon: 'attribute-table2',
          component: MobileAttributesTable,
          disabled: false
        }
      }
      return {
        name: 'attribute-table',
        component: {
          render () {
            return (
              <portal to="bottom-panel">
                <AttributesTable key="attribute-table" onClose={this.close}/>
              </portal>
            )
          },
          methods: {
            close () {
              this.$store.commit('activeTool', null)
            }
          }
        }
      }
    },
    items () {
      return [
        this.hiddenIdentificationTool,
        this.identificationTool,
        this.measureTool,
        this.printTool,
        this.attributeTableTool
      ]
    },
    activeToolObj () {
      return this.activeTool && this.items.find(t => t.name === this.activeTool)
    },
    activeToolPanelVisible () {
      return this.activeToolObj?.title
    }
  },
  watch: {
    activeTool: {
      immediate: true,
      handler (activeTool) {
        if (this.hiddenIdentification && !activeTool) {
          this.$store.commit('activeTool', 'hidden-identification')
        }
      }
    }
  },
  methods: {
    onClose () {
      this.$store.commit('activeTool', null)
    }
  }
}
</script>

<style lang="scss" scoped>
.actions {
  flex-basis: 0;
  .btn {
    padding: 0;
  }
}
</style>
