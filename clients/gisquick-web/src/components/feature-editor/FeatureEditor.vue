
<template>
  <v-layout v-if="feature" column>
    <slot
      name="form"
      :fields="fields"
      :layer="layer"
      :readonly="readonlyFields"
    >
      <generic-edit-form
        :layer="layer"
        :fields="fields"
        :readonly="readonlyFields"
      />
    </slot>
    <portal to="infopanel-tool">
      <v-layout class="tools-container align-center pl-1">
        <v-tooltip bottom>
          <v-btn
            slot="activator"
            :class="{'primary--text': editGeometry}"
            @click="editGeometry = !editGeometry"
            icon
          >
            <icon name="edit-geometry"/>
          </v-btn>
          <translate>Edit geometry</translate>
        </v-tooltip>
        <geometry-editor
          v-if="editGeometry"
          ref="geometryEditor"
          :feature="editGeometryFeature"
          :geometry-type="geomType"
        />
        <v-divider vertical/>
        <!-- <v-btn @click="deleteFeature" icon>
          <v-icon color="red darken-3">delete_forever</v-icon>
        </v-btn> -->
        <v-menu top fixed>
          <v-tooltip slot="activator" bottom>
            <v-btn
              slot="activator"
              :disabled="!permissions.delete || status === 'loading'"
              icon
            >
              <v-icon color="red darken-3">delete_forever</v-icon>
            </v-btn>
            <translate>Delete object</translate>
          </v-tooltip>
          <v-card>
            <v-card-text class="py-1 px-3 grey lighten-3">
              <small><b><translate>Delete current object?</translate></b></small>
            </v-card-text>
            <v-divider/>
            <v-card-actions class="py-1">
              <v-btn small flat>
                <translate>No</translate>
              </v-btn>
              <v-btn small flat color="primary" @click="deleteFeature">
                <translate>Yes</translate>
              </v-btn>
            </v-card-actions>
          </v-card>
        </v-menu>
        <v-tooltip bottom>
          <v-btn
            slot="activator"
            :disabled="!permissions.update || !isModified || !!status"
            @click="restore"
            icon
          >
            <v-icon color="orange">restore</v-icon>
          </v-btn>
          <translate>Discard changes</translate>
        </v-tooltip>
        <v-tooltip bottom>
          <v-btn
            slot="activator"
            :disabled="!isModified || !!status"
            @click="save"
            icon
          >
            <v-icon color="teal">save</v-icon>
          </v-btn>
          <translate>Save changes</translate>
        </v-tooltip>
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
import Feature from 'ol/feature'

import { wfsTransaction } from '@/map/wfs'
import { queuedUpdater } from '@/utils'
import GeometryEditor from './GeometryEditor.vue'
import GenericEditForm from './GenericEditForm.vue'
import ProgressAction from '@/components/ProgressAction.vue'


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
  components: { GeometryEditor, GenericEditForm, ProgressAction },
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
    geomType () {
      const geom = this.feature && this.feature.getGeometry()
      if (geom) {
        return geom.getType()
      }
      return this.layer.wkb_type || {
        POINT: 'MultiPoint',
        LINE: 'MultiLineString',
        POLYGON: 'MultiPolygon'
      }[this.layer.geom_type]
    },
    readonlyFields () {
      return this.layer.pk_attributes || []
    },
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
    },
    permissions () {
      return this.layer.permissions || {}
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
    this.statusController = queuedUpdater(v => { this.status = v })
  },
  beforeDestroy () {
    this.restore()
  },
  methods: {
    restore () {
      this.fields = getFeatureFields(this.feature)
      this.editGeometry = false
    },
    wfsTransaction (operations) {
      this.statusController.set('loading', 1000)
      wfsTransaction(this.project.config.ows_url, this.layer.name, operations)
        .then(async () => {
          await this.statusController.set('success', 1500)
          this.statusController.set(null, 100)
          const { updates = [], deletes = [] } = operations
          updates.forEach(f => this.$emit('edit', f))
          deletes.forEach(f => this.$emit('delete', f))
        })
        .catch(err => {
          this.errorMsg = err.message || 'Error'
          this.statusController.set('error', 3000)
          this.statusController.set(null, 100)
        })
    },
    save () {
      const f = new Feature()
      const changedFields = difference(this.fields, this.originalFields)
      f.setProperties(changedFields)
      if (this.geomModified) {
        let newGeom = this.$refs.geometryEditor.getGeometry()
        const mapProjection = this.$map.getView().getProjection().getCode()
        if (mapProjection !== this.layer.projection) {
          newGeom = newGeom.clone()
          newGeom.transform(mapProjection, this.layer.projection)
        }
        f.setGeometry(newGeom)
      }
      f.setId(this.feature.getId())
      this.wfsTransaction({ updates: [f] })
    },
    deleteFeature () {
      this.wfsTransaction({ deletes: [this.feature] })
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
  .v-divider--vertical {
    height: 20px;
    margin: 0 2px;
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
