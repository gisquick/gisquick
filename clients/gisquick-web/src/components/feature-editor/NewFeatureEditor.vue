
<template>
  <div class="f-col">
    <slot
      name="form"
      :fields="fields"
      :layer="layer"
    >
      <generic-edit-form
        class="f-grow"
        :layer="layer"
        :fields="fields"
        :project="project.config"
        :status.sync="formStatus"
      />
    </slot>
    <portal
      :to="toolbarTarget"
      :disabled="!toolbarTarget"
    >
      <div class="toolbar f-row-ac">
        <geometry-editor
          :editor.sync="references.geometryEditor"
          :geometry-type="geomType"
          :geom-toolbar="geomToolbar"
        />
        <div v-if="!geomToolbar" class="f-grow"/>
        <v-btn
          class="icon"
          :disabled=" status === 'loading' || formStatus === 'error'"
          @click="save"
        >
          <v-icon color="green" name="save"/>
        </v-btn>
      </div>
    </portal>
    <transition name="fade">
      <div v-if="status" class="status-notification f-row">
        <div
          class="content shadow-2 f-row-ac p-2"
          :class="status"
        >
          <progress-action class="mr-2" :status="status"/>
          <translate v-if="status === 'loading'" key="pending">Updating data</translate>
          <translate v-else-if="status === 'success'" key="success">Data updated</translate>
          <span v-else key="error" v-text="errorMsg"/>
        </div>
      </div>
    </transition>
  </div>
</template>

<script>
import { mapState } from 'vuex'
import Feature from 'ol/Feature'
import format from 'date-fns/format'

import { queuedUpdater, ShallowObj } from '@/utils'
import { wfsTransaction } from '@/map/wfs'
import GeometryEditor from './GeometryEditor.vue'
import GenericEditForm from './GenericEditForm.vue'
import ProgressAction from '@/components/ProgressAction.vue'

export default {
  name: 'NewFeatureEditor',
  components: { GeometryEditor, GenericEditForm, ProgressAction },
  props: {
    layer: Object,
    toolbarTarget: String,
    geomToolbar: String
  },
  data () {
    return {
      status: '',
      errorMsg: '',
      fields: null,
      formStatus: null,
      references: ShallowObj({
        geometryEditor: null
      })
    }
  },
  computed: {
    ...mapState(['project']),
    geomType () {
      return this.layer.wkb_type || {
        POINT: 'MultiPoint',
        LINE: 'MultiLineString',
        POLYGON: 'MultiPolygon'
      }[this.layer.geom_type]
    }
  },
  watch: {
    layer: {
      immediate: true,
      handler (layer) {
        const fields = {}
        layer.attributes.forEach(attr => {
          fields[attr.name] = null
        })
        this.fields = fields
      }
    }
  },
  created () {
    this.statusController = queuedUpdater(v => { this.status = v })
  },
  methods: {
    createFeature (fields) {
      const properties = { ...fields }
      Object.entries(properties).forEach(([name, value]) => {
        if (typeof value === 'boolean') {
          properties[name] = value ? '1' : '0'
        }
      })
      const f = new Feature()
      f.setProperties(properties)
      return f
    },
    showError (msg) {
      this.errorMsg = msg || this.$gettext('Error')
      this.statusController.set('error', 3000)
      this.statusController.set(null, 100)
    },
    async resolveFields (operation) {
      const resolvedFields = {}
      for (const name in this.fields) {
        let value = this.fields[name]
        if (typeof value === 'function') {
          value = await value()
          this.fields[name] = value
        }
        resolvedFields[name] = value
      }
      this.layer.attributes.filter(a => a.widget === 'Autofill').forEach(a => {
        if (a.config.operations?.includes(operation)) {
          let value
          if (a.config.value === 'user') {
            value = this.$store.state.user.username
          } else if (a.config.value === 'current_datetime') {
            value = new Date().toISOString()
          } else if (a.config.value === 'current_date') {
            value = format(new Date(), a.config?.field_format || 'yyyy-MM-dd')
          } else {
            return
          }
          resolvedFields[a.name] = value
        }
      })
      return resolvedFields
    },
    async save () {
      try {
        var resolvedFields = await this.resolveFields('insert')
      } catch (err) {
        this.showError(err.message)
        return
      }
      const f = this.createFeature(resolvedFields)
      const geom = this.references.geometryEditor.getGeometry()
      // Transform to projection of project
      let newGeom = geom
      const mapProjection = this.$map.getView().getProjection().getCode()
      if (newGeom && mapProjection !== this.layer.projection) {
        newGeom = newGeom.clone()
        newGeom.transform(mapProjection, this.layer.projection)
      }
      f.setGeometry(newGeom)

      this.statusController.set('loading', 1000)
      wfsTransaction(this.project.config.ows_url, this.layer.name, { inserts: [f] })
        .then(async ( { data }) => {
          const parser = new DOMParser()
          const doc = parser.parseFromString(data, 'application/xml')
          const fid = doc.querySelector('InsertResults > Feature FeatureId')?.getAttribute('fid')
          await this.statusController.set('success', 1500)
          this.statusController.set(null, 100)
          this.$emit('edit', fid)
        })
        .catch(err => {
          this.showError(err.message)
        })
    }
  }
}
</script>

<style lang="scss" scoped>
.toolbar {
  padding: 0 2px;
  ::v-deep .btn.icon {
    width: 26px;
    height: 26px;
  }
}
.status-notification {
  position: absolute;
  inset: 0;
  align-items: center;
  justify-content: center;
  z-index: 10;
  background-color: rgba(0, 0, 0, 0.2);
  svg {
    border: 1px solid currentColor;
    border-radius: 50%;
    // color: var(--icon-color);
  }
  .content {
    min-width: 150px;
    max-width: 250px;
    font-size: 14px;
    border-radius: 3px;
    margin: 6px;
    background-color: #444;
    color: #fff;
    transition: 0.4s ease;
    &.error {
      background-color: var(--color-red);
    }
  }
}
</style>
