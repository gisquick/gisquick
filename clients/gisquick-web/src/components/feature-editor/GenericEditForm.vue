<template>
  <div class="generic-edit-form f-col light">
    <template v-for="(attr, index) in layer.attributes">
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

<script>
import mapValues from 'lodash/mapValues'
// import NumberField from './NumberField.vue'
import TextField from './TextField.vue'
import MediaImageField from './MediaImageField.vue'
import { valueMapItems } from '@/adapters/attributes'


function isIntegerString (strValue) {
  return /^-?\d+$/.test(strValue)
}
function toInteger (v) {
  return isIntegerString(v) ? parseInt(v) : v
}
function toNumber (v) {
  return !isNaN(v) ? parseFloat(v) : v
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
    mediaImage () {
      return {
        component: MediaImageField,
        props: {
          url: null,
          accept: 'image/*',
          location: this.layer.name
        }
      }
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
      return this.layer.attributes.map(attr => {
        const disabled = attr.constrains?.includes('readonly')
        const type = attr.type.split('(')[0]?.toLowerCase()
        if (attr.widget === 'ValueMap') {
          return {
            component: 'v-select',
            props: {
              class: 'filled',
              items: valueMapItems(attr)
            }
          }
        } else if (attr.widget === 'MediaImage') {
          const url = `/api/project/media/${this.project.name}`
          return {
            component: MediaImageField,
            props: {
              url,
              location: `web/${this.layer.name}`,
              disabled // TODO: implement
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
          props: { disabled }
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
