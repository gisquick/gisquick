<template>
  <div>
    <portal to="main-panel-top">
      <collapse-transition class="collapsible">
        <div v-if="activeToolObj && activeToolObj.title">
          <v-toolbar dark flat height="30">
            <v-spacer/>
            <h4>{{ activeToolObj.title }}</h4>
            <v-spacer/>
            <v-btn flat @click="$store.commit('activeTool', null)">
              <v-icon>close</v-icon>
            </v-btn>
          </v-toolbar>
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

import AttributesTable from './AttributesTable'
import Identification from './Identification'
import Measure from './measure/Measure'
import Print from './print/Print'

export default {
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
          render (h) {
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
