
import keyBy from 'lodash/keyBy'
import { mapState, mapGetters } from 'vuex'

import { layerFeaturesQuery } from '@/map/featureinfo'
import { valueMapItems } from '@/adapters/attributes'
import { downloadExcel } from '@/xlsx-export'
import FeaturesReader from './features.js'


export default {
  mixins: [FeaturesReader],
  data () {
    return {
      pagination: null,
      selected: null,
      showInfoPanel: false,
      mode: 'view',
      sortBy: null
    }
  },
  computed: {
    ...mapState(['project']),
    ...mapState('attributeTable', ['page', 'limit', 'visibleAreaFilter', 'layer', 'features']),
    ...mapGetters('attributeTable', ['layerFilters']),
    selectedFeature () {
      return this.selected && this.features.find(f => f.getId() === this.selected.id)
    },
    permissions () {
      return this.layer.permissions || {}
    },
    attributesToExport () {
      if (this.layer?.export_fields) {
        const attrsMap = keyBy(this.layer.attributes, 'name')
        return this.layer.export_fields.map(n => attrsMap[n])
      }
      return []
    }
  },
  watch: {
    layer: {
      immediate: true,
      handler (layer) {
        if (layer) {
          this.pagination = null
          this.sortBy = {
            property: layer.attr_table_fields?.[0] ?? layer.attributes[0].name,
            order: 'asc'
          }
        }
      }
    }
  },
  methods: {
    async onFeatureInsert (fid) {
      setTimeout(() => {
        this.mode = 'edit'
      }, 1500)
      const addedFeature = await this.getFeatureById(fid, this.layer)
      const features = Object.freeze([addedFeature, ...this.features])
      this.pagination.totalItems += 1
      this.$store.commit('attributeTable/features', features)
      this.selected = { layer: this.layer.name, id: fid}
      this.$map.ext.refreshOverlays()
    },
    updateFeatures (features) {
      this.$store.commit('attributeTable/features', features)
    },
    updateLimit (value) {
      this.$store.commit('attributeTable/limit', value)
    },
    updateVisibleAreaFilter (enabled) {
      this.$store.commit('attributeTable/visibleAreaFilter', enabled)
    },
    updateFilters (filters) {
      this.$store.commit('attributeTable/filters', { layer: this.layer.name, filters })
    },
    async onFeatureEdit (ef) {
      this.$map.ext.refreshOverlays()
      const fid = ef.getId()
      const edited = await this.getFeatureById(fid, this.layer)
      const features = Object.freeze(this.features.map(f => f.getId() === fid ? edited : f))
      this.$store.commit('attributeTable/features', features)
    },
    onFeatureDelete (f) {
      this.$map.ext.refreshOverlays()
      this.fetchFeatures(this.pagination.page, true)
    },
    async exportFeatures () {
      const params = {
        VERSION: '1.1.0',
        SERVICE: 'WFS',
        REQUEST: 'GetFeature',
        OUTPUTFORMAT: 'GeoJSON',
        STARTINDEX: 0
      }
      const headers = { 'Content-Type': 'text/xml' }
      const attrsNames = this.attributesToExport.map(a => a.name)
      const { sortBy, queryParams } = this.pagination
      // console.log('export', sortBy, queryParams)
      const query = layerFeaturesQuery(this.layer, { ...queryParams, propertyNames: attrsNames, sortBy })
      const { data } = await this.$http.post(this.project.config.ows_url, query, { params, headers })
      const header = this.attributesToExport.map(a => a.alias || a.name)

      const linkText = this.$gettext('link')
      const formatters = this.attributesToExport.map(attr => {
        if (attr.widget === 'Hyperlink') {
          return v => ({ v: linkText, l: { Target: v } })
        }
        if (attr.widget === 'ValueMap') {
          const items = valueMapItems(attr)
          const map = items.reduce((data, item) => (data[item.value] = item.text, data), {})
          return v => map[v]
        }
        return v => v
      })
      const rows = data.features.map(f => attrsNames.map((n, i) => formatters[i](f.properties[n])))
      downloadExcel(header, rows, this.layer.title, this.layer.title)
    },
    getPermalinkParams () {
      if (this.selected) {
        return {
          features: this.selected.id
        }
      }
    },
    getPrintData () {
      if (this.selectedFeature) {
        return { infoPanel: this.$refs.infoPanel?.getPrintData() }
      }
    }
  }
}
