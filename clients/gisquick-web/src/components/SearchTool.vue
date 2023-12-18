<template>
  <div
    v-if="service"
    class="search-tool dark f-row-ac"
    :class="{expanded}"
  >
    <v-btn class="toggle icon flat" @click="toggle">
      <v-icon name="magnifier"/>
    </v-btn>
    <div v-if="expanded" class="toolbar f-row-ac">
      <v-autocomplete
        ref="autocomplete"
        :placeholder="tr.SearchAddress"
        class="flat inline"
        :loading="loading"
        :error="error"
        :min-chars="1"
        :items="suggestions"
        highlight-fields="text"
        @input="onInput"
        :value="result"
        @text:update="onTextChangeDebounced"
      >
        <template v-slot:item="{ html }">
          <div class="item f-row f-grow">
            <div class="f-grow">
              <span class="address" v-html="html.text"/>
            </div>
          </div>
        </template>
        <template v-slot:error="{ error }">
          <div class="f-row-ac">
            <v-icon name="warning" color="red"/>
            <v-tooltip>{{ error }}</v-tooltip>
          </div>
        </template>
      </v-autocomplete>
      <features-viewer :features="features"/>
    </div>
  </div>
</template>

<script>
import { mapState } from 'vuex'
import debounce from 'lodash/debounce'
import Point from 'ol/geom/Point'
import Feature from 'ol/Feature'
import { toLonLat, fromLonLat, transformExtent } from 'ol/proj'
import VAutocomplete from '@/ui/Autocomplete.vue'
import FeaturesViewer from '@/components/ol/FeaturesViewer.vue'

export default {
  name: 'search',
  components: { VAutocomplete, FeaturesViewer },
  data () {
    return {
      suggestions: [],
      feature: null,
      expanded: false,
      loading: false,
      error: '',
      result: null
    }
  },
  computed: {
    ...mapState(['project']),
    service () {
      const name = this.project.config.search?.geocoding?.service
      switch (name) {
        case 'arcgis': return this.arcgisService()
        case 'geoapify': return this.geoapifyService()
      }
      return null
    },
    features () {
      return this.feature ? [this.feature] : []
    },
    tr () {
      return {
        SearchAddress: this.$gettext('Search address'),
      }
    }
  },
  methods: {
    clear () {
      this.feature = null
      this.result = null
      this.suggestions = []
      this.$refs.autocomplete?.clear()
    },
    toggle () {
      this.expanded = !this.expanded
      if (this.expanded) {
        this.$nextTick(() => {
          this.$refs.autocomplete.focus()
        })
      } else {
        this.clear()
      }
    },
    arcgisService () {
      const wkid = this.project.config.projection.split(':')?.[1]
      const formatExtent = extent => {
        const [ xmin, ymin, xmax, ymax ] = extent
        return JSON.stringify({
          xmin, ymin, xmax, ymax,
          spatialReference: { wkid }
        })
      }
      const formatLocation = coords => {
        const [x, y] = coords
        return JSON.stringify({
          x: this.$map.ext.formatCoordinate(x),
          y: this.$map.ext.formatCoordinate(y),
          spatialReference: { wkid: 102067 }
        })
      }
      const projectExtent = formatExtent(this.project.config.project_extent)
      return {
        autocomplete: async (text) => {
          const params = {
            text,
            location: formatLocation(this.$map.getView().getCenter()),
            // countryCode: 'SK',
            searchExtent: projectExtent,
            maxSuggestions: 8,
            f: 'json',
            distance: 10000
          }
          const { data } = await this.$http.get(`/api/map/search/${this.project.config.name}/suggest`, { params })
          return data.suggestions
        },
        getFeature: async (item) => {
          const { text, magicKey } = item
          const params = {
            text,
            magicKey: magicKey,
            SingleLine: text,
            searchExtent: projectExtent,
            location: formatLocation(this.$map.getView().getCenter()),
            outSR: wkid,
            f: 'json'
          }
          const { data } = await this.$http.get(`/api/map/search/${this.project.config.name}/findAddressCandidates`, { params })
          const result = data.candidates[0]
          if (result) {
            const { x, y } = result.location
            return new Feature({ geometry: new Point([x, y]) })
          }
          return null
        }
      }
    },
    geoapifyService () {
      return {
        autocomplete: async (text) => {
          const [x, y] = this.$map.getView().getCenter()
          const [lon, lat] = toLonLat([x, y], this.$map.getView().getProjection())
          const projectExtent = this.project.config.project_extent
          const viewExtent = this.$map.getView().calculateExtent()
          const filters = [
            // 'countrycode:sk',
            `rect:${transformExtent(projectExtent, this.$map.getView().getProjection(), 'EPSG:4326')}`
          ]
          const biases = [
            `proximity:${lon},${lat}`,
            `rect:${transformExtent(viewExtent, this.$map.getView().getProjection(), 'EPSG:4326')}`
          ]
          const params = {
            text,
            format: 'json',
            filter: filters.join('|'),
            bias: biases.join('|')
          }
          const { data } = await this.$http.get(`/api/map/search/${this.project.config.name}/autocomplete`, { params })
          const suggestions = data.results
          suggestions.forEach(i => {
            i.text = i.formatted
            i.geom = new Point(fromLonLat([i.lon, i.lat], this.$map.getView().getProjection()))
          })
          return Object.freeze(suggestions)
        },
        getFeature: async (item) => {
          return new Feature({ geometry: item.geom })
        }
      }
    },
    async suggest (text) {
      return await this.service.autocomplete(text)
    },
    async onInput (item) {
      if (this.result === item) {
        if (this.feature) {
          this.$map.ext.zoomToFeature(this.feature)
        }
        return
      }
      const feature = item ? await this.service.getFeature(item) : null
      if (feature) {
        this.$map.ext.zoomToFeature(feature)
      }
      this.result = item
      this.feature = feature ? Object.freeze(feature) : null
    },
    onTextChangeDebounced: debounce(async function (text) {
      this.onTextChange(text)
    }, 400),
    async onTextChange (text) {
      if (text.length > 0) {
        this.loading = true
        this.error = ''
        try {
          this.suggestions = await this.suggest(text)
        } catch (err) {
          this.error = err.message || this.$gettext('Error')
        } finally {
          this.loading = false
        }
      } else {
        this.suggestions = []
      }
    }
  }
}
</script>

<style lang="scss" scoped>
.search-tool {
  margin-top: 7px;
  margin-bottom: 7px;
  --gutter: 0;
  --fill-color: #3b3b3b;
  --border-color: #5a5a5a;
  border-radius: 4px;
  background-color: #333;
  .btn {
    width: 32px;
    height: 32px;
  }
  .i-field.autocomplete {
    min-width: 280px;
    ::v-deep {
      .input {
        height: 28px;
      }
    }
  }
  .i-field.select {
    line-height: 28px;
    min-width: 80px;
    font-size: 15px;
    ::v-deep {
      .input {
        height: 28px;
      }
    }
  }
  .toolbar {
    gap: 6px;
    padding-right: 6px;
  }
}
</style>
