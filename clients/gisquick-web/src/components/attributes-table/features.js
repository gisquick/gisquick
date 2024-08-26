import GeoJSON from 'ol/format/GeoJSON'
import { formatFeatures } from '@/formatters'

export default {
  methods: {
    readFeatures (data, layer) {
      const mapProjection = this.$map.getView().getProjection().getCode()
      const parser = new GeoJSON()
      const features = parser.readFeatures(data, { featureProjection: mapProjection })
      return formatFeatures(this.project, layer, features)
    }
  }
}
