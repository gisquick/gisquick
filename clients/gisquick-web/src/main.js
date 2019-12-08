// The Vue build version to load with the `import` command
// (runtime-only or standalone) has been set in webpack.base.conf with an alias.
import Vue from 'vue'
import Vuetify from 'vuetify'
import 'material-icons/iconfont/material-icons.scss'
import 'vuetify/dist/vuetify.min.css'
import PortalVue from 'portal-vue'
import GetTextPlugin from 'vue-gettext'
import { ReactiveRefs } from 'vue-reactive-refs'
import 'url-polyfill'

import http from './client'
import store from './store/index'
import translations from './lang/translations.json'
import App from './App'
import { Icon, ScrollArea, TextSeparator } from './components/ui'
import {
  Collapsible,
  CollapseTransition,
  CollapseWidth,
  SwitchTransition,
  SlideTop
} from './components/transitions'

// import all icons
const svgIcons = require.context('../icons', false, /.*\.svg$/)
svgIcons.keys().map(svgIcons)

Vue.config.productionTip = false

Vue.use(PortalVue)
Vue.use(Vuetify)
Vue.use(ReactiveRefs)
Vue.use(GetTextPlugin, { translations, defaultLanguage: 'en-us', muteLanguages: ['en-us'] })

// register general purpose components globally
Vue.component('icon', Icon)
Vue.component('scroll-area', ScrollArea)
Vue.component('text-separator', TextSeparator)
Vue.component('v-collapsible', Collapsible)
Vue.component('collapse-transition', CollapseTransition)
Vue.component('collapse-width-transition', CollapseWidth)
Vue.component('switch-transition', SwitchTransition)
Vue.component('slide-top-transition', SlideTop)

Vue.prototype.$http = http

if (process.env.NODE_ENV === 'development') {
  var initialize = new Promise((resolve, reject) => {
    http.get('/dev/map/' + location.search)
      .then(resp => resolve(resp.data))
      .catch(reject)
  })
} else {
  initialize = new Promise(resolve => {
    resolve(JSON.parse(document.getElementById('app-data').textContent))
  })
}

initialize.then(data => {
  store.commit('app', data.app)
  store.commit('user', data.user)
  store.commit('project', data.project)
  document.title = data.project.root_title
  const vm = new Vue({
    store,
    beforeCreate () {
      // globally change default props of some components
      Vue.component('v-checkbox').options.props.ripple.default = false
      Vue.component('v-btn').options.props.ripple.default = false
    },
    render: h => h(App)
  })
  if (data.app.lang) {
    vm.$language.current = data.app.lang
  }
  vm.$mount('#app')
})
