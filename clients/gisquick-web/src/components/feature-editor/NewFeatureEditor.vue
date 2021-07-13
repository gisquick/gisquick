
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
        <div class="f-row f-justify-center notification my-2">
          <transition name="fade">
            <div
              v-if="status"
              class="notification-content elevation-3 f-row-ac px-2 f-shrink"
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
        </div>
      </div>
    </portal>
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
