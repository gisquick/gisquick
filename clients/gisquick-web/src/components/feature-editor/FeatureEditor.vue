
<template>
  <div v-if="feature" class="f-col">
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
      <!-- <v-radio-btn val="loading" v-model="status" label="Loading"/>
      <v-radio-btn val="success" v-model="status" label="Success"/>
      <v-radio-btn val="error" v-model="status" label="Error"/>
      <v-radio-btn val="" v-model="status" label="None"/> -->
      <v-tooltip
        align="c;bt"
        content-class="notification my-2"
        :value="!!status"
      >
        <div
          class="content f-row-ac"
          :class="status"
        >
          <progress-action
            :status="status"
            class="mr-2"
          />
          <span v-if="status === 'loading'">Updating data</span>
          <span v-else-if="status === 'success'">Data updated</span>
          <span v-else>Error</span>
        </div>
      </v-tooltip>
    </slot>
    <portal to="infopanel-tool">
      <div class="toolbar f-row-ac">
        <v-btn
          class="icon flat"
          :color="editGeometry && 'primary'"
          @click="editGeometry = !editGeometry"
        >
          <v-tooltip slot="tooltip">
            <translate>Edit geometry</translate>
          </v-tooltip>
          <v-icon name="edit-geometry"/>
        </v-btn>
        <geometry-editor
          v-if="editGeometry"
          ref="geometryEditor"
          :feature="editGeometryFeature"
          :geometry-type="geomType"
        />
        <div class="v-separator"/>
        <!-- <v-btn @click="deleteFeature" icon>
          <v-icon color="red darken-3">delete_forever</v-icon>
        </v-btn> -->
        <v-menu align="ll;bt">
          <template v-slot:activator="{ toggle }">
            <v-btn
              aria-label="Delete object"
              class="icon"
              :disabled="!permissions.delete || status === 'loading'"
              @click="toggle"
            >
              <v-icon color="red" name="delete_forever"/>
              <v-tooltip slot="tooltip">
                <translate>Delete object</translate>
              </v-tooltip>
            </v-btn>
          </template>
          <template v-slot:menu="{ close }">
            <div class="prompt-menu popup-content light f-col">
              <div class="header dark px-4">
                <span class="title"><translate>Delete current object?</translate></span>
              </div>
              <hr/>
              <div class="f-row-ac">
                <v-btn class="small round outlined f-grow" color="#555" @click="close">
                  <translate>No</translate>
                </v-btn>
                <v-btn class="small round f-grow" color="red" @click="deleteFeature">
                  <translate>Yes</translate>
                </v-btn>
              </div>
            </div>
          </template>
        </v-menu>
        <v-btn
          class="icon"
          :disabled="!permissions.update || !isModified || !!status"
          @click="restore"
        >
          <v-tooltip slot="tooltip">
            <translate>Discard changes</translate>
          </v-tooltip>
          <v-icon color="orange" name="restore"/>
        </v-btn>
        <v-btn
          class="icon"
          :disabled="!isModified || !!status"
          @click="save"
        >
          <v-tooltip slot="tooltip">
            <translate>Save changes</translate>
          </v-tooltip>
          <v-icon color="green" name="save"/>
        </v-btn>

        <!-- <div class="f-row f-justify-center notification my-2">
          <transition name="fade">
            <div
              v-if="status"
              class="notification-content elevation-3 f-row-ac py-1 px-2 f-shrink"
              :class="status === 'error' ? 'red darken-2' : 'grey darken-3'"
            >
              <progress-action
                :status="status"
                class="mr-2"
              />
              <span v-if="status === 'loading'">Updating data</span>
              <span v-else-if="status === 'success'">Data updated</span>
              <span v-else>Error</span>
            </div>
          </transition>
        </div> -->
      </div>
    </portal>
  </div>
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
// import ProgressAction from '@/components/ProgressAction3.vue'


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
.toolbar {
  background-color: #e0e0e0;
  border-top: 1px solid #bbb;
  ::v-deep .btn.icon {
    margin: 3px 2px;
    width: 26px;
    height: 26px;
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
    // color: var(--icon-color);
  }
  .content {
    width: 150px;
    font-size: 14px;
    border-radius: 0px;

    &.error {
      // color: var(--color-red);
    }
  }
}
.prompt-menu {
  .header {
    background-color: var(--color-dark);
    white-space: nowrap;
    .title {
      font-size: 13px;
      font-weight: 500;
    }
  }
}
</style>
