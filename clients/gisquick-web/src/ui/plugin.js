import {
  VBtn,
  VIcon,
  VCheckbox,
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


export default {
  install (Vue) {
    Vue.component('v-btn', VBtn)
    Vue.component('v-icon', VIcon)
    Vue.component('v-checkbox', VCheckbox)
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
  }
}
