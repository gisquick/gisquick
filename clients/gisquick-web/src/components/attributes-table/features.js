import GeoJSON from 'ol/format/GeoJSON'
import { formatFeatures } from '@/formatters'

export default {
  methods: {
    readFeatures (data, layer) {
      const mapProjection = this.$map.getView().getProjection().getCode()
      const parser = new GeoJSON()
      const features = parser.readFeatures(data, { featureProjection: mapProjection })
      return formatFeatures(this.project, layer, features)
    },
    async getFeatureById (fid, layer) {
      const params = {
        VERSION: '1.1.0',
        SERVICE: 'WFS',
        REQUEST: 'GetFeature',
        OUTPUTFORMAT: 'GeoJSON',
        FEATUREID: fid,
      }
      const { data } = await this.$http.get(this.project.config.ows_url, { params })
      return this.readFeatures(data, layer)[0]
    }
  }
}
