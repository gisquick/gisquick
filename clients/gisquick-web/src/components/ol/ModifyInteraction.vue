
<script lang="js">
import Modify from 'ol/interaction/Modify'
import Collection from 'ol/Collection'

export default {
  props: {
    features: Array,
    olStyle: [Array, Object]
  },
  created () {
    const featuresCollection = new Collection()
    const modify = new Modify({
      features: featuresCollection,
      style: this.olStyle
    })
    modify.on('modifystart', e => this.$emit('modifystart', e))
    modify.on('modifyend', e => this.$emit('modifyend', e))
    this.$watch('features', features => {
      featuresCollection.clear()
      if (features) {
        featuresCollection.extend(features)
      }
    }, { immediate: true })
    this.$map.addInteraction(modify)
    this.$once('hook:beforeDestroy', () => this.$map.removeInteraction(modify))
  },
  render: () => null
}
</script>
