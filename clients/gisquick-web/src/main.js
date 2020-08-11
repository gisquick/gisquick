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

import Swiper from './swiper'
import http from './client'
import store from './store/index'
import translations from './lang/translations.json'
import App from './App'
import ServerError from './ServerError'
import { Icon, ScrollArea, TextSeparator } from './components/ui'
import BasicScrollArea from './components/ui/BasicScrollArea'

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
const mobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry/i.test(navigator.userAgent)
window.env = {
  mobile
}
if (mobile) {
  Vue.use(Swiper)
}

Vue.use(PortalVue)
Vue.use(Vuetify)
Vue.use(ReactiveRefs)
Vue.use(GetTextPlugin, { translations, defaultLanguage: 'en-us', muteLanguages: ['en-us'] })

// register general purpose components globally
Vue.component('icon', Icon)
Vue.component('scroll-area', mobile ? BasicScrollArea : ScrollArea)
Vue.component('text-separator', TextSeparator)
Vue.component('v-collapsible', Collapsible)
Vue.component('collapse-transition', CollapseTransition)
Vue.component('collapse-width-transition', CollapseWidth)
Vue.component('switch-transition', SwitchTransition)
Vue.component('slide-top-transition', SlideTop)

Vue.prototype.$http = http

function createApp (data) {
  store.commit('app', data.app)
  store.commit('user', data.user)
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
    document.documentElement.setAttribute('lang', data.app.lang.split('-')[0])
  }
  vm.$mount('#app')
}

function errorPage (err) {
  // const status = err && err.response && err.response.status
  // let msg = 'Failed to initialize application'
  // if (status === 502) {
  //   msg = 'Server is currently not online, please try later.'
  // }
  const vm = new Vue({
    render: h => h(ServerError)
  })
  vm.$mount('#app')
}

http.get('/api/app/')
  .then(resp => createApp(resp.data))
  .catch(err => errorPage(err))
