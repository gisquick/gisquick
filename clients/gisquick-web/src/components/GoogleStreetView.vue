
<template>
  <v-btn
    class="g-street-view icon"
    @click="streetViewHandler"
    @pointerdown.native="streetViewInit"
    :color="streetViewActive ? 'primary' : ''"
  >
    <div
      v-show="streetViewActive"
      class="deactivate f-col"
      @click.stop="deactivateStreetView"
    >
      <v-icon name="street-view" size="24"/>
    </div>
  </v-btn>
</template>

<script>
import { unByKey } from 'ol/Observable'
import StreetView from 'ol-street-view'
import 'ol-street-view/lib/style/scss/ol-street-view.scss'

export default {
  props: {
    apiKey: String
  },
  data () {
    return {
      streetViewActive: false
    }
  },
  mounted () {
    setTimeout(() => {
      this.setupStreetView()
      const streetViewEl = document.getElementById('ol-street-view--pegman-button-div')
      if (streetViewEl) {
        this.$el.appendChild(streetViewEl)
      }
    })
  },
  beforeDestroy () {
    if (this._streetView) {
      if (!this._streetView._translatePegman) {
        // prevent null pointer exception in following removeControl
        this._streetView._translatePegman = { setActive: () => {}}
      }
      this._streetView._map.removeControl(this._streetView)
      this._streetView = null
    }
  },
  methods: {
    setupStreetView () {
      const lang = this.$language.current
      let i18n
      if (lang !== 'en' && lang !== 'es') {
        i18n = {
          exit: this.$gettext('Exit'),
          exitView: this.$gettext('Exit Street View mode'),
          dragToInit: this.$gettext('Drag and drop to initialize Google Street View'),
          googleMapsLibraryError: this.$gettext('Google Maps Library is not loaded'),
          noImages: this.$gettext('No images found. Click on the map to move'),
          termsOfService: this.$gettext('Terms of Service'),
          expand: this.$gettext('Expand'),
          minimize: this.$gettext('Minimize')
        }
      }
      const opt_options = {
        apiKey: this.apiKey,
        size: 'md', // lg, md, sm
        radius: 150,
        updatePegmanToClosestPanorama: true,
        transparentButton: true,
        zoomOnInit: null,
        minZoom: null,
        resizable: true,
        sizeToggler: true,
        defaultMapSize: 'expanded',
        autoLoadGoogleMaps: true,
        language: lang,
        i18n
      }
      const streetView = new StreetView(opt_options)

      streetView._addClickListener = function () {
        const clickListener = (evt) => {
          this._updateStreetViewPosition(evt.coordinate)
          evt.preventDefault()
          evt.stopPropagation()
        }
        this._clickOnMapEventKey = this._map.on('singleclick', clickListener)
      }
      streetView.addEventListener('streetViewInit', () => {
        this.streetViewActive = true
      })
      streetView.addEventListener('streetViewExit', () => {
        this.streetViewActive = false
        if (this._svKey) {
          unByKey(this._svKey)
          this._svKey = null
        }
      })
      this.$map.addControl(streetView) // or streetView.setMap(map)
      this._streetView = streetView
    },
    streetViewInit (e) {
      this._streetView._options.zoomOnInit = this.$map.getView().getZoom()
    },
    streetViewHandler (e) {
      // if (!this._streetView.element.classList.contains('ol-street-view--activated')) {
      if (!this.streetViewActive) {
        if (!this._streetView._addedXyzLayer) {
          this._streetView._addStreetViewXyzLayer()
          this._svKey = this.$map.once('singleclick', evt => this._streetView.showStreetView(evt.coordinate))
        } else {
          this._streetView._removeStreetViewXyzLayer()
          if (this._svKey) {
            unByKey(this._svKey)
            this._svKey = null
          }
          // this._streetView.hideStreetView()
        }
      }
    },
    deactivateStreetView () {
      this._streetView.hideStreetView()
    }
  }
}
</script>

<style lang="scss" scoped>
.street-view:has(>.ol-street-view--activated) {
  display: none;
  // background-color: var(--color-primary);
}
.deactivate {
  width: 32px;
  height: 32px;
  align-items: center;
  justify-content: center;
}
</style>

<style lang="scss">
div:has(>.gm-iv-address) {
  transform: translate(6px, 38px);
}
.gm-iv-address {
  border-radius: 3px;
}
.map-control {
  #ol-street-view--pegman-button-div {
    width: 32px;
    height: 32px;
    position: static;
  }
  #ol-street-view--pegman-button {
    margin-top: -2px;
    margin-left: -4px;
  }
  #ol-street-view--pegman-draggable {
    transform-origin: center center;
  }
  #ol-street-view--pegman-button-div #ol-street-view--pegman-button, #ol-street-view--pegman-draggable::before {
    background-image: url(@/assets/street-view.png);
    width: 32px;
    height: 32px;
  }
}
</style>
