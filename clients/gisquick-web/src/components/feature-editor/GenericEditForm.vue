<template>
  <div class="generic-edit-form f-col light">
    <template v-for="(attr, index) in attributes">
      <slot :name="attr.name" :attr="attr">
        <component
          :key="attr.name"
          ref="widget"
          :is="widgets[index].component"
          :initial="initial && initial[attr.name]"
          :label="attr.alias || attr.name"
          :status.sync="statuses[attr.name]"
          v-model="fields[attr.name]"
          v-bind="widgets[index].props"
        />
      </slot>
    </template>
  </div>
</template>

<script lang="js">
import keyBy from 'lodash/keyBy'
import mapValues from 'lodash/mapValues'
// import NumberField from './NumberField.vue'
import TextField from './TextField.vue'
import MediaFileField from './MediaFileField.vue'
import { valueMapItems } from '@/adapters/attributes'
import { mediaUrl } from '@/components/GenericInfopanel.vue'

function isIntegerString (strValue) {
  return /^-?\d+$/.test(strValue)
}
function toInteger (v) {
  return isIntegerString(v) ? parseInt(v) : v
}
function toNumber (v) {
  return !isNaN(v) ? parseFloat(v) : v
}
function isTrueValue (v) {
  return v === true || v == 1 || v?.toLowerCase?.() === 'true'
}

export default {
  props: {
    layer: Object,
    fields: Object,
    initial: Object,
    project: Object
  },
  data () {
    return {
      statuses: {}
    }
  },
  computed: {
    attributes () {
      const { attributes, info_panel_fields } = this.layer
      if (info_panel_fields) {
        const attrsMap = keyBy(attributes, 'name')
        return info_panel_fields.map(name => attrsMap[name])
      }
      return attributes
    },
    tr () {
      return {
        NotValidNumber: this.$gettext('Not valid number'),
        NotValidInteger: this.$gettext('Not valid integer number')
      }
    },
    integerValidator () {
      return v => v && !isIntegerString(v) ? this.tr.NotValidInteger : ''
    },
    numberValidator () {
      return v => v && isNaN(v) ? this.tr.NotValidNumber : ''
    },
    widgets () {
      return this.attributes.map(attr => {
        const disabled = attr.constrains?.includes('readonly')
        const type = attr.type.split('(')[0]?.toLowerCase()

        if (attr.widget === 'Autofill') {
          return {}
        }
        if (attr.widget === 'ValueMap') {
          return {
            component: 'v-select',
            props: {
              disabled,
              class: 'filled',
              items: valueMapItems(attr)
            }
          }
        } else if (attr.widget === 'MediaImage' || attr.widget === 'MediaFile') {
          const { base: url, location } = mediaUrl(this.project.name, this.layer, attr)
          return {
            component: MediaFileField,
            props: {
              url,
              location,
              filename: attr.config?.filename || '<random>',
              options: attr.config,
              disabled
            }
          }
        }
        if (type === 'bool') {
          return { component: 'v-checkbox', props: { disabled } }
        }
        if (type === 'date') {
          return {
            component: 'v-date-field',
            props: {
              disabled,
              placeholder: attr.config?.display_format,
              displayFormat: attr.config?.display_format,
              valueFormat: attr.config?.field_format || 'yyyy-MM-dd'
            }
          }
        }
        if (type === 'integer' || type === 'double' || type === 'int' || type === 'float') {
          const integerType = type === 'integer' || type === 'int'
          return {
            component: TextField,
            props: {
              type: 'number',
              validator: integerType ? this.integerValidator : this.numberValidator,
              transform: integerType ? toInteger : toNumber,
              disabled
            }
          }
          // return {
          //   component: NumberField,
          //   props: {
          //     integer: type === 'integer',
          //     disabled
          //   }
          // }
        }
        return {
          component: TextField,
          props: { disabled, multiline: isTrueValue(attr.config?.IsMultiline), rows: 3 }
        }
      })
    },
    status () {
      return Object.values(this.statuses).some(s => s === 'error') ? 'error' : 'ok'
    }
  },
  watch: {
    fields: {
      immediate: true,
      handler (fields) {
        this.statuses = mapValues(fields, () => null)
      }
    },
    status (val) {
      this.$emit('update:status', val)
    }
  },
  methods: {
    async beforeFeatureUpdated (f) {
      await Promise.all(this.$refs.widget.map(w => w.beforeFeatureUpdated?.(f)))
    },
    async afterFeatureUpdated (f) {
      await Promise.all(this.$refs.widget.map(w => w.afterFeatureUpdated?.(f)))
    },
    async beforeFeatureDeleted (f) {
      await Promise.all(this.$refs.widget.map(w => w.beforeFeatureDeleted?.(f)))
    },
    async afterFeatureDeleted (f) {
      await Promise.all(this.$refs.widget.map(w => w.afterFeatureDeleted?.(f)))
    }
  }
}
</script>

<style lang="scss" scoped>
.generic-edit-form {
  background-color: #f3f3f3;
}
</style>
