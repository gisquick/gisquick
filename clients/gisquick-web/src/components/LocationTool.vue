<template>
  <div>
    <vector-layer
      :features="features"
      :ol-style="locationStyle"
    />
    <popup-content
      align="ll;bt"
      transition="slide-y"
      origin="notification"
      popup-class="f-col-ac"
      :bounds="bounds"
      :open="!!error"
      :popup-style="{width: '100%'}"
    >
      <div class="popup-content notification f-row-ac p-2 m-4">
        <v-icon name="circle-error-outline" />
        <span class="m-2" v-text="error"/>
        <v-btn class="small flat" color="yellow" @click="error = null">
          <translate>Close</translate>
        </v-btn>
      </div>
    </popup-content>
  </div>
</template>

<script lang="js">
import Feature from 'ol/Feature'
import Point from 'ol/geom/Point'
import Geolocation from 'ol/Geolocation'
import VectorLayer from '@/components/ol/VectorLayer.vue'
import { unByKey } from 'ol/Observable'

import { ShallowObj, ShallowArray } from '@/utils'
import { simpleStyle, highlightedStyle } from '@/map/styles'
import { elementBounds } from '@/ui/utils/popup'
import PopupContent from '@/ui/PopupContent.vue'

export default {
  components: { VectorLayer, PopupContent },
  data () {
    return {
      error: null,
      bounds: null,
      features: ShallowArray([new Feature(), new Feature()])
    }
  },
  computed: {
    feature () {
      return this.features[0]
    },
    locationStyle () {
      return simpleStyle({
        fill: [3, 169, 244, 0.8],
        stroke: '#ffffffc9',
        strokeWidth: 2,
        radius: 8
      })
    }
  },
  mounted () {
    const geolocation = new Geolocation({
      trackingOptions: {
        timeout: 20000,
        enableHighAccuracy: true
      },
      tracking: true,
      projection: this.$map.getView().getProjection()
    })

    const changeKey = geolocation.on('change', e => {
      const data = e.target.getProperties()
      const location = {
        accuracy: data.accuracy,
        altitude: data.altitude,
        altitudeAccuracy: data.altitudeAccuracy,
        heading: data.heading,
        speed: data.speed,
        position: data.position?.slice()
      }
      this.setPosition(data.position)
      this.setAccuracyGeom(e.target.getAccuracyGeometry())
      this.$store.commit('location', location)
    })

    const errorKey = geolocation.on('error', this.showError)
    // this.showError({ xmessage: 'GPS error' })
    this.$once('hook:beforeDestroy', () => {
      unByKey(changeKey)
      unByKey(errorKey)
      this.$store.commit('location', null)
    })
    this.setPosition(geolocation.getPosition())
    this.setAccuracyGeom(geolocation.getAccuracyGeometry())
  },
  methods: {
    showError (evt) {
      const msg = this.$gettext('Geolocation Error')
      this.error = evt.message ? `${msg}: ${evt.message}` : msg
      this.bounds = elementBounds(document.body)
    },
    setPosition (coords) {
      const geom = coords ? new Point(coords) : null
      this.feature.setGeometry(geom)
    },
    setAccuracyGeom (geom) {
      this.features[1].setGeometry(geom)
    }
  }
}
</script>

<style lang="scss" scoped>
.notification {
  font-size: 14px;
  line-height: 1.3;
  background-color: var(--color-dark);
  color: #fff;
  --icon-color: #fff;
  max-width: 90%;
}
</style>
