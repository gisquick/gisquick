<script lang="js">
import Select from 'ol/interaction/Select'
import Collection from 'ol/Collection'

import { keyListener, updateLock, ShallowArray } from '@/utils'

export default {
  props: {
    layers: [Array, Object],
    olStyle: [Array, Object],
    selection: Array,
    active: {
      type: Boolean,
      default: true
    }
  },
  created () {
    const select = new Select({
      features: new Collection(ShallowArray()),
      layers: Array.isArray(this.layers) ? this.layers : [this.layers],
      style: this.olStyle,
      hitTolerance: 10
    })

    const { eventHandler, updateHandler } = updateLock()
    select.on('select', eventHandler(e => this.$emit('update:selection', e.target.getFeatures().getArray())))
    this.$map.addInteraction(select)
    this.$once('hook:beforeDestroy', () => this.$map.removeInteraction(select))

    this.$watch('active', active => select.setActive(active), { immediate: true })
    this.$watch('selection', updateHandler(selected => {
      if (selected === select.getFeatures().getArray()) {
        return
      }
      select.getFeatures().clear()
      if (selected) {
        select.getFeatures().extend(selected)
      }
    }), { immediate: true })

    if (this.$listeners.keydown) {
      const unbind = keyListener(evt => this.$emit('keydown', evt))
      this.$once('hook:beforeDestroy', unbind)
    }
  },
  render: () => null
}
</script>
