// requires stylus, and stylus-loader
import VRangeSlider from 'vuetify/es5/components/VRangeSlider/VRangeSlider'

export default {
  extends: VRangeSlider,
  props: ['fixed'],
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
}
