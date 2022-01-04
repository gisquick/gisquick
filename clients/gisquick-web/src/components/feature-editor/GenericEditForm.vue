<template>
  <div class="f-col form light">
    <template v-for="(attr, index) in layer.attributes">
      <slot :name="attr.name" :attr="attr">
        <component
          :key="attr.name"
          ref="widget"
          :is="widgets[index].component"
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
import TextField from './TextField.vue'

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
    readonly: Array
  },
  data () {
    return {
      statuses: {}
    }
  },
  computed: {
    config () {
      return this.$store.state.project.config
    },
    owsUrl () {
      return this.config.ows_url
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
        const disabled = this.readonly && this.readonly.includes(attr.name)
        if (attr.type === 'INTEGER' || attr.type === 'DOUBLE') {
          const integerType = attr.type === 'INTEGER'
          return {
            component: TextField,
            props: {
              type: 'number',
              validator: integerType ? this.integerValidator : this.numberValidator,
              transform: integerType ? toInteger : toNumber,
              disabled
            }
          }
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
    async beforeDelete () {
      for (const w of this.$refs.widget) {
        await w.beforeFeatureDeleted?.()
      }
    },
    async afterDelete () {
      for (const w of this.$refs.widget) {
        await w.afterFeatureDeleted?.()
      }
    }
  }
}
</script>

<style lang="scss" scoped>
.form {
  background-color: #f3f3f3;
}
</style>
