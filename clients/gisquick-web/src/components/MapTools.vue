<template>
  <div>
    <portal to="main-panel-top">
      <collapse-transition class="collapsible">
        <div v-if="activeToolObj && activeToolObj.title" class="f-col">
          <div v-if="showHeader" class="panel-header f-row-ac dark">
            <span class="f-grow"/>
            <span class="title">{{ activeToolObj.title }}</span>
            <div class="actions f-grow f-row-ac f-justify-end">
              <!-- <v-icon size="18" class="mx-2" name="settings"/> -->
              <v-btn
                class="icon dense"
                @click="$store.commit('activeTool', null)"
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
      v-bind.sync="activeToolObj.props"
      @close="$store.commit('activeTool', null)"
    />
  </div>
</template>

<script>
import Vue from 'vue'
import { mapState } from 'vuex'

import AttributesTable from '@/components/AttributesTable.vue'
import Identification from '@/components/Identification.vue'
import Measure from '@/components/measure/Measure.vue'
import Print from '@/components/print/Print.vue'

export default {
  props: {
    showHeader: Boolean
  },
  computed: {
    ...mapState(['project', 'activeTool']),

    identification () {
      return {
        name: 'identification',
        title: this.$pgettext('noun', 'Identification'),
        icon: 'identification',
        props: Vue.observable({
          identificationLayer: '',
          displayMode: 'both'
        }),
        component: Identification
      }
    },
    measure () {
      return {
        name: 'measure',
        title: this.$pgettext('noun', 'Measure'),
        icon: 'ruler',
        component: Measure
      }
    },
    print () {
      return {
        name: 'print',
        title: this.$pgettext('noun', 'Print'),
        icon: 'printer',
        component: Print,
        disabled: !this.project.config.print_composers || this.project.config.print_composers.length < 1
      }
    },
    attributeTable () {
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
        this.identification,
        this.measure,
        this.print,
        this.attributeTable
      ]
    },
    activeToolObj () {
      return this.activeTool && this.items.find(t => t.name === this.activeTool)
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
