
<template>
  <div class="f-col">
    <slot
      name="form"
      :fields="fields"
      :layer="layer"
    >
      <generic-edit-form
        :layer="layer"
        :fields="fields"
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
        />
        <div class="v-separator"/>
        <v-btn
          class="icon"
          :disabled=" status === 'loading'"
          @click="save"
        >
          <v-icon color="green" name="save"/>
        </v-btn>
      </div>
    </portal>
    <transition name="fade">
      <div v-if="status" class="notification f-row">
        <div
          class="content shadow-2 f-row-ac p-2"
          :class="status"
        >
          <progress-action class="mr-2" :status="status"/>
          <translate v-if="status === 'loading'" key="pending">Updating data</translate>
          <translate v-else-if="status === 'success'" key="success">Data updated</translate>
          <translate v-else key="error">Error</translate>
        </div>
      </div>
    </transition>
  </div>
</template>

<script>
import { mapState } from 'vuex'
import Feature from 'ol/feature'

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
    toolbarTarget: String
  },
  data () {
    return {
      status: '',
      errorMsg: '',
      fields: null,
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
    save () {
      console.log('save')
      const f = new Feature()
      const geom = this.references.geometryEditor.getGeometry()
      f.setProperties(this.fields)
      f.setGeometry(geom)
      console.log({ ...this.fields })
      console.log(geom)
      console.log(geom && geom.flatCoordinates)

      this.statusController.set('loading', 1000)
      wfsTransaction(this.project.config.ows_url, this.layer.name, { inserts: [f] })
        .then(async () => {
          await this.statusController.set('success', 1500)
          this.statusController.set(null, 100)
          this.$emit('edit')
        })
        .catch(err => {
          this.errorMsg = err.message || 'Error'
          this.statusController.set('error', 3000)
          this.statusController.set(null, 100)
        })
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
    width: 150px;
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
