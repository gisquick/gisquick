
<template>
  <div v-if="feature">
    <slot
      name="form"
      :fields="fields"
      :layer="layer"
    />
    <portal to="infopanel-tool">
      <v-layout class="tools-container align-center pl-1">
        <v-btn @click="deleteFeature" icon>
          <v-icon color="red darken-3">delete_forever</v-icon>
        </v-btn>
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
        <v-btn :disabled="!isModified" @click="restore" icon>
          <v-icon>restore</v-icon>
        </v-btn>
        <v-btn :disabled="!isModified" @click="save" icon>
          <v-icon>save</v-icon>
        </v-btn>
      </v-layout>
    </portal>
  </div>
</template>

<script>
import omit from 'lodash/omit'
import isEqual from 'lodash/isEqual'
import Style from 'ol/style/style'

import GeometryEditor from './GeometryEditor'

function getFeatureFields (feature) {
  return feature ? omit(feature.getProperties(), feature.getGeometryName()) : {}
}

const HiddenStyle = new Style()

export default {
  name: 'FeatureEditor',
  components: { GeometryEditor },
  refs: ['geometryEditor'],
  props: {
    layer: Object,
    feature: Object
  },
  data () {
    return {
      fields: null,
      originalFields: null,
      editGeometry: false
    }
  },
  computed: {
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
  },
  beforeDestroy () {
    this.restore()
  },
  methods: {
    restore () {
      this.fields = getFeatureFields(this.feature)
      this.editGeometry = false
    },
    save () {},
    deleteFeature () {}
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
</style>
