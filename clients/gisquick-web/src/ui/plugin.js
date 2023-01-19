import {
  VBtn,
  VIcon,
  VCheckbox,
  VDateField,
  VDialog,
  VLinearProgress,
  VMenu,
  VRadioBtn,
  VSelect,
  VSlider,
  VSpinner,
  VSwitch,
  VTable,
  VTextField,
  VTooltip,
  VTreeView
} from './index'

function ShallowObj (Vue, obj) {
  const refs = {}
  Vue.observable(refs)
  Object.keys(obj).forEach(key => {
    Vue.util.defineReactive(refs, key, obj[key], null, true)
  })
  return refs
}

export default {
  install (Vue) {
    Vue.component('v-btn', VBtn)
    Vue.component('v-icon', VIcon)
    Vue.component('v-checkbox', VCheckbox)
    Vue.component('v-date-field', VDateField)
    Vue.component('v-dialog', VDialog)
    Vue.component('v-linear-progress', VLinearProgress)
    Vue.component('v-menu', VMenu)
    Vue.component('v-radio-btn', VRadioBtn)
    Vue.component('v-select', VSelect)
    Vue.component('v-slider', VSlider)
    Vue.component('v-spinner', VSpinner)
    Vue.component('v-switch', VSwitch)
    Vue.component('v-table', VTable)
    Vue.component('v-text-field', VTextField)
    Vue.component('v-tooltip', VTooltip)
    Vue.component('v-tree-view', VTreeView)

    const store = ShallowObj(Vue, { activeEl: null, popups: {} })
    const focusListener = () => {
      // console.log('focused: ', document.activeElement)
      store.activeEl = document.activeElement
    }
    document.addEventListener('focus', focusListener, true)
    const chains = {}
    store.addPopup = (id, srcEl, popupEl) => {
      // console.log('# addPopup')
      for (const [pid, [sEl, pEl]] of Object.entries(store.popups)) {
        if (pEl.contains(srcEl)) {
          // console.log('Nested Popups:', id, '->', pid)
          chains[id] = pid
        }
      }
      store.popups[id] = [srcEl, popupEl]
    }
    store.removePopup = id => {
      // console.log('# removePopup', id)
      delete store.popups[id]
      delete chains[id]
    }
    store.isLinked = (target, src) => {
      // console.log('chains', chains)
      for (const [pid, [_, pEl]] of Object.entries(store.popups)) {
        if (pEl.contains(target)) {
          // console.log('popup id', pid)
          let originId = pid
          while (chains[originId]) {
            originId = chains[originId]
          }
          // console.log('origin id', originId)
          const originEl = store.popups[originId]?.[0]
          if (originEl && src.contains(originEl)) {
            return true
          }
        }
      }
      return false
    }
    Vue.prototype.$ui = store
  }
}
