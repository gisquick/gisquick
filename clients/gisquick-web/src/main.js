// The Vue build version to load with the `import` command
// (runtime-only or standalone) has been set in webpack.base.conf with an alias.
import Vue from 'vue'
import Vuetify from 'vuetify'
import 'url-polyfill'
import PortalVue from 'portal-vue'

import http from './client'
import store from './store/index'
import App from './App'
import Icon from './ui/Icon'
import ScrollArea from './ui/ScrollArea'
import TextSeparator from './ui/TextSeparator'
import Collapsible from './transitions/Collapsible'
import CollapseTransition from './transitions/CollapseTransition'
import SwitchTransition from './transitions/SwitchTransition'
import CollapseWidth from './transitions/CollapseWidth'

import 'material-icons/iconfont/material-icons.scss'
import 'vuetify/dist/vuetify.min.css'
import './common.scss'

// register general purpose components globally
Vue.component('scroll-area', ScrollArea)
Vue.component('text-separator', TextSeparator)
Vue.component('v-collapsible', Collapsible)
Vue.component('collapse-transition', CollapseTransition)
Vue.component('collapse-width', CollapseWidth)
Vue.component('switch-transition', SwitchTransition)

Vue.config.productionTip = false

Vue.use(PortalVue)
Vue.use(Vuetify)
Vue.component('icon', Icon)
Vue.prototype.$http = http

if (process.env.NODE_ENV === 'development') {
  var initialize = new Promise((resolve, reject) => {
    http.get('/dev/vue' + location.search)
      .then(resp => resolve(resp.data))
      .catch(reject)
  })
} else {
  initialize = new Promise(resolve => {
    resolve(JSON.parse(document.getElementById('app-data').textContent))
  })
}

initialize.then(data => {
  store.commit('user', data.user)
  store.commit('project', data.project)
  new Vue({
    store,
    beforeCreate () {
      // globally change default props of some components
      Vue.component('v-checkbox').options.props.ripple.default = false
      Vue.component('v-btn').options.props.ripple.default = false
    },
    render: h => h(App)
  }).$mount('#app')
})
