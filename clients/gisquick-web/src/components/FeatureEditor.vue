
<template>
  <v-layout v-if="feature" column>
    <slot
      name="form"
      :fields="fields"
      :layer="layer"
    />
    <portal to="infopanel-tool">
      <v-layout class="tools-container align-center pl-1">
        <!-- <v-btn @click="deleteFeature" icon>
          <v-icon color="red darken-3">delete_forever</v-icon>
        </v-btn> -->
        <v-menu top fixed>
          <v-btn
            slot="activator"
            :disabled="status === 'loading'"
            icon
          >
            <v-icon color="red darken-3">delete_forever</v-icon>
          </v-btn>
          <v-card>
            <v-card-text class="py-1 px-3 grey lighten-3">
              <small><b>Delete current object?</b></small>
            </v-card-text>
            <v-divider/>
            <v-card-actions class="py-1">
              <v-btn small flat>No</v-btn>
              <v-btn small flat color="primary" @click="deleteFeature">Yes</v-btn>
            </v-card-actions>
          </v-card>
        </v-menu>
        <v-btn
          :class="{'primary--text': editGeometry}"
          @click="editGeometry = !editGeometry"
          icon
        >
          <icon name="edit-geometry"/>
        </v-btn>
        <geometry-editor
          v-if="editGeometry"
          ref="geometryEditor"
          :feature="editGeometryFeature"
        />
        <v-btn
          :disabled="!isModified"
          @click="restore"
          icon
        >
          <v-icon>restore</v-icon>
        </v-btn>
        <v-btn
          :disabled="!isModified || status === 'loading'"
          @click="save"
          icon
        >
          <v-icon>save</v-icon>
        </v-btn>
        <v-layout class="justify-center notification my-2">
          <transition name="fade">
            <v-layout
              v-if="status"
              class="notification-content elevation-3 align-center py-1 px-2 shrink"
              :class="status === 'error' ? 'red darken-2' : 'grey darken-3'"
            >
              <progress-action
                :status="status"
                class="mr-2"
              />
              <span v-if="status === 'loading'">Updating data</span>
              <span v-else-if="status === 'success'">Data updated</span>
              <span v-else>Error</span>
            </v-layout>
          </transition>
        </v-layout>
      </v-layout>
    </portal>
  </v-layout>
</template>

<script>
import { mapState } from 'vuex'
import omit from 'lodash/omit'
import isEqual from 'lodash/isEqual'
import Style from 'ol/style/style'
import WFS from 'ol/format/wfs'
import Feature from 'ol/feature'

import { queuedUpdater } from '@/utils'
import GeometryEditor from './GeometryEditor'
import ProgressAction from './ProgressAction'


function getFeatureFields (feature) {
  return feature ? omit(feature.getProperties(), feature.getGeometryName()) : {}
}

function difference (obj1, obj2) {
  const diff = {}
  Object.keys(obj1).forEach(key => {
    if (!isEqual(obj1[key], obj2[key])) {
      diff[key] = obj1[key]
    }
  })
  return diff
}

const HiddenStyle = new Style()

export default {
  name: 'FeatureEditor',
  components: { GeometryEditor, ProgressAction },
  refs: ['geometryEditor'],
  props: {
    layer: Object,
    feature: Object
  },
  data () {
    return {
      status: '',
      errorMsg: '',
      fields: null,
      originalFields: null,
      editGeometry: false
    }
  },
  computed: {
    ...mapState(['project']),
    fieldsModified () {
      return !isEqual(this.fields, this.originalFields)
    },
    geomModified () {
      const editor = this.$refs.geometryEditor
      return editor && editor.geomModified
    },
    isModified () {
      return this.fieldsModified || this.geomModified
    },
    editGeometryFeature () {
      return this.editGeometry && this.feature
    }
  },
  watch: {
    feature: {
      immediate: true,
      handler (feature, old) {
        this.fields = getFeatureFields(feature)
        this.originalFields = getFeatureFields(feature)
      }
    }
  },
  created () {
    let origStyle
    this.$watch('editGeometryFeature', (feature, prevFeature) => {
      if (prevFeature && prevFeature.getStyle() === HiddenStyle) {
        prevFeature.setStyle(origStyle)
      }
      if (feature) {
        origStyle = feature.getStyle()
        feature.setStyle(HiddenStyle)
      }
    })
    this.$once('hook:beforeDestroy', () => {
      if (this.editGeometryFeature && this.editGeometryFeature.getStyle() === HiddenStyle) {
        this.editGeometryFeature.setStyle(origStyle)
      }
    })
    this.statusController = queuedUpdater(v  => { this.status = v })
  },
  beforeDestroy () {
    this.restore()
  },
  methods: {
    restore () {
      this.fields = getFeatureFields(this.feature)
      this.editGeometry = false
    },
    wfsEditRequest (inserts, updates, deletes) {
      const wfs = new WFS()
      const opts = {
        featureNS: 'http://gisquick.org',
        featurePrefix: '',
        featureType: this.layer.name,
        version: '1.1.0'
      }
      const nodeEl = wfs.writeTransaction(inserts, updates, deletes, opts)
      const query = nodeEl.outerHTML
      const httpOpts = {
        params: {
          'VERSION': '1.1.0',
          'SERVICE': 'WFS'
        },
        headers: {
          'Content-Type': 'text/xml'
        }
        // responseType: 'xml'
      }
      this.statusController.set('loading', 1000)
      this.$http.post(this.project.config.ows_url, query, httpOpts)
        .then(resp => {
          const respXML = resp.request.responseXML
          if (!respXML) {
            throw new Error('Server error')
          }
          const check = {
            TotalInserted: inserts.length,
            TotalUpdated: updates.length,
            TotalDeleted: deletes.length
          }
          Object.entries(check)
            .filter(([tag, count]) => count > 0)
            .forEach(([tag, count]) => {
              const el = respXML.querySelector(tag)
              const value = el && parseInt(el.textContent)
              if (count !== value) {
                throw new Error('Data update error')
              }
            })
          this.statusController.set('success', 1500)
          this.statusController.set(null, 100)
          this.$emit('edit')
        })
        .catch(err => {
          let msg = null
          if (err.response) {
            const info = err.response.request.responseXML.querySelector('ServiceException')
            msg = info && info.textContent
            // const el = respXML.querySelector('Message')
            // const err = msg && msg.textContent
          } else {
            msg = err.message
          }
          this.errorMsg = msg || 'Error'
          this.statusController.set('error', 3000)
          this.statusController.set(null, 100)
        })
    },
    save () {
      const f = new Feature()
      const changedFields = difference(this.fields, this.originalFields)
      f.setProperties(changedFields)
      if (this.geomModified) {
        const newGeom = this.$refs.geometryEditor.getGeometry()
        f.setGeometry(newGeom)
      }
      f.setId(this.feature.getId())
      const updates = [f]
      this.wfsEditRequest([], updates, [])
    },
    deleteFeature () {
      this.wfsEditRequest([], [], [this.feature])
    }
  }
}
</script>

<style lang="scss" scoped>
.tools-container {
  /deep/ .v-btn {
    margin: 3px 0;
    height: 24px;
  }
}
.v-snack {
  padding: 0 8px 12px 8px;
  /deep/ .v-snack__content {
    height: auto;
    padding: 8px 12px;
  }
}
.notification {
  position: absolute;
  width: 100%;
  bottom: 2em;
  align-self: center;
  text-align: center;
  opacity: 0.8;
  svg {
    border: 1px solid currentColor;
    border-radius: 50%;
  }
  .notification-content {
    min-width: 150px;
    transition: 0.3s all ease;
    border-radius: 2px;
    color: #fff;
  }
}
</style>
