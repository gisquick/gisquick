<script>
import Translate from 'ol/interaction/Translate'
import Collection from 'ol/Collection'

export default {
  props: {
    features: Array,
    olStyle: [Array, Object]
  },
  created () {
    const featuresCollection = new Collection()
    const interaction = new Translate({
      features: featuresCollection,
      style: this.olStyle
    })
    interaction.on('translatestart', e => this.$emit('translatestart', e))
    interaction.on('translateend', e => this.$emit('translateend', e))
    interaction.on('translating', e => this.$emit('translating', e))
    this.$watch('features', features => {
      featuresCollection.clear()
      if (features) {
        featuresCollection.extend(features)
      }
    }, { immediate: true })
    this.$map.addInteraction(interaction)
    this.$once('hook:beforeDestroy', () => this.$map.removeInteraction(interaction))
  },
  render: () => null
}
</script>
