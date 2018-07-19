// The Vue build version to load with the `import` command
// (runtime-only or standalone) has been set in webpack.base.conf with an alias.
import Vue from 'vue'
import Vuetify from 'vuetify'
import 'url-polyfill'

import App from './App'
import Icon from './ui/Icon'
import ScrollArea from './ui/ScrollArea'
import TextSeparator from './ui/TextSeparator'
import Collapsible from './transitions/Collapsible'
import CollapseTransition from './transitions/CollapseTransition'
import SwitchTransition from './transitions/SwitchTransition'

import 'material-icons/iconfont/material-icons.scss'
import 'vuetify/dist/vuetify.min.css'


// register general purpose components globally
Vue.component('scroll-area', ScrollArea)
Vue.component('text-separator', TextSeparator)
Vue.component('v-collapsible', Collapsible)
Vue.component('collapse-transition', CollapseTransition)
Vue.component('switch-transition', SwitchTransition)

Vue.config.productionTip = false

Vue.use(Vuetify)
Vue.component('icon', Icon)

/* eslint-disable no-new */
new Vue({
  el: '#app',
  template: '<App/>',
  components: { App },
  beforeCreate () {
    // globally change default props of some components
    Vue.component('v-checkbox').options.props.ripple.default = false
    Vue.component('v-btn').options.props.ripple.default = false
  }
})
