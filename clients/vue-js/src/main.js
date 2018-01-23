// The Vue build version to load with the `import` command
// (runtime-only or standalone) has been set in webpack.base.conf with an alias.
import Vue from 'vue'
import Vuetify from 'vuetify'
import 'vuetify/dist/vuetify.min.css'
import 'url-polyfill'

import App from './App'
import Icon from './components/Icon'
import ScrollArea from './components/ScrollArea'
import Collapsible from './components/Collapsible'

// register general purpose components globally
Vue.component('scroll-area', ScrollArea)
Vue.component('v-collapsible', Collapsible)


Vue.config.productionTip = false

Vue.use(Vuetify)
Vue.component('icon', Icon)
// Disable ripple ink effect by overriding Vuetify's directive
Vue.directive('ripple', (el, binding) => {})


/* eslint-disable no-new */
new Vue({
  el: '#app',
  template: '<App/>',
  components: { App }
})
