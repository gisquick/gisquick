import Vue from 'vue'
/*
  Defined as async component to have access to globally registered 'v-range-slider' component.
  Otherwise it would be needed to import this component from 'vuetify/es5/components/VRangeSlider/VRangeSlider',
  which would require 'stylus' and 'stylus-loader'.
*/
Vue.component(
  'f-range-slider',
  (resolve, reject) => {
    const VRangeSlider = Vue.component('v-range-slider')

    resolve({
      extends: VRangeSlider,
      props: ['fixed'],
      // Define new event type 'update' for v-model to insert required fixed range logic
      model: {
        prop: 'value',
        event: 'update'
      },
      created () {
        const validateRange = val => {
          if (val[0] < this.min) {
            return [this.min, val[1] + this.min - val[0]]
          }
          if (val[1] > this.max) {
            return [val[0] + this.max - val[1], this.max]
          }
          return val
        }
        this.$on('input', val => {
          if (this.fixed) {
            let fixedValue = val
            if (val[0] !== this.value[0]) {
              fixedValue = validateRange([val[0], val[1] + val[0] - this.value[0]])
            }
            if (val[1] !== this.value[1]) {
              fixedValue = validateRange([val[0] + val[1] - this.value[1], val[1]])
            }
            return this.$emit('update', fixedValue)
          }
          this.$emit('update', val)
        })
      }
    })
  }
)
