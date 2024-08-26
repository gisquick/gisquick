<template>
  <div class="generic-edit-form f-col light">
    <template v-for="(attr, index) in attributes">
      <field-wrapper :key="attr.name">
        <slot :name="attr.name" :attr="attr">
          <component
            ref="widget"
            :is="widgets[index].component"
            :initial="initial && initial[attr.name]"
            :label="attr.alias || attr.name"
            :status.sync="statuses[attr.name]"
            v-model="fields[attr.name]"
            v-bind="widgets[index].props"
            :error="validationErrors[index]"
          />
        </slot>
        <relation-widget
          v-if="fieldsRelations[attr.name]"
          :project="project"
          :layer="layer"
          :relation="fieldsRelations[attr.name]"
          @change="updateRelationValue"
        />
      </field-wrapper>
    </template>
  </div>
</template>

<script>
import keyBy from 'lodash/keyBy'
import mapValues from 'lodash/mapValues'
// import NumberField from './NumberField.vue'
import TextField from './TextField.vue'
import MediaFileField from './MediaFileField.vue'
import { valueMapItems } from '@/adapters/attributes'
import { mediaUrl } from '@/components/GenericInfopanel.vue'
import RelationWidget from './RelationWidget.vue'

function isIntegerString (strValue) {
  return /^-?\d+$/.test(strValue)
}
function toInteger (v) {
  return isIntegerString(v) ? parseInt(v) : null
}
function toNumber (v) {
  return !isNaN(v) ? parseFloat(v) : null
}
function isTrueValue (v) {
  return v === true || v == 1 || v?.toLowerCase?.() === 'true'
}

function multiValidator (...validators) {
  return v => {
    for (const vv of validators) {
      const err = vv(v)
      if (err) {
        return err
      }
    }
  }
}

const FieldWrapper = {
  functional: true,
  props: {
    multi: Boolean
  },
  render (h, ctx) {
    const { multi } = ctx.props
    if (ctx.children[1].isComment) {
      return ctx.children
    }
    return <div class="field-wrapper">{ ctx.children }</div>
  }
}

export default {
  components: { FieldWrapper, RelationWidget },
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
        NotValidInteger: this.$gettext('Not valid integer number'),
        RequiredFieldErr: this.$gettext('Field is required')
      }
    },
    requiredValidator () {
      return v => (v === null || v === '') ? this.tr.RequiredFieldErr : ''
    },
    integerValidator () {
      return v => v && !isIntegerString(v) ? this.tr.NotValidInteger : ''
    },
    numberValidator () {
      return v => v && isNaN(v) ? this.tr.NotValidNumber : ''
    },
    widgets () {
      return this.attributes.map(attr => {
        const disabled = attr.constraints?.includes('readonly')
        const required = attr.constraints?.includes('not_null')
        const type = attr.type.split('(')[0]?.toLowerCase()
        let validators = []
        if (required) {
          validators.push(this.requiredValidator)
        }
        if (attr.widget === 'Autofill') {
          return {}
        }
        if (attr.widget === 'ValueMap') {
          return {
            component: 'v-select',
            validator: !disabled && multiValidator(...validators),
            props: {
              disabled,
              class: 'filled trim-text',
              items: valueMapItems(attr)
            }
          }
        } else if (attr.widget === 'MediaImage' || attr.widget === 'MediaFile') {
          const { base: url, location } = mediaUrl(this.project.config.name, this.layer, attr)
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
            validator: !disabled && multiValidator(...validators),
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
          validators.push(integerType ? this.integerValidator : this.numberValidator)
          return {
            component: TextField,
            validator: !disabled && multiValidator(...validators),
            props: {
              type: 'number',
              // validator: multiValidator(...validators),
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
          validator: !disabled && multiValidator(...validators),
          props: {
            disabled,
            multiline: isTrueValue(attr.config?.IsMultiline),
            rows: 3,
            // validator: multiValidator(...validators)
          }
        }
      })
    },
    validationErrors () {
      return this.attributes.map((attr, i) => {
        const validator = this.widgets[i].validator
        if (validator) {
          return validator(this.fields[attr.name])
        }
        return ''
      })
    },
    status () {
      return this.validationErrors.some(err => err) || Object.values(this.statuses).some(s => s === 'error') ? 'error' : 'ok'
    },
    relations () {
      return this.layer.relations?.filter(r => r.infopanel_view !== 'hidden').map(r => {
        const rLayer = this.project.overlays.byName[r.referencing_layer]
        return {
          ...r,
          referencing_layer: rLayer
        }
      })
    },
    fieldsRelations () {
      const map = {}
      this.relations?.forEach(rel => rel.referenced_fields.forEach(f => {
        map[f] = rel
      }))
      return map
    }
  },
  watch: {
    fields: {
      immediate: true,
      handler (fields) {
        this.statuses = mapValues(fields, () => null)
      }
    },
    status: {
      immediate: true,
      handler (val) {
        this.$emit('update:status', val)
      }
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
    },
    updateRelationValue (relation, feature) {
      relation.referenced_fields.forEach((f, i) => {
        const field = relation.referencing_fields[i]
        this.fields[f] = feature.get(field)
      })
    }
  }
}
</script>

<style lang="scss" scoped>
.generic-edit-form {
  background-color: #f3f3f3;
}
.field-wrapper {
  display: flex;
  align-items: flex-end;
  > :first-child {
    flex-grow: 1;
  }
  > :nth-child(2) {
    flex-shrink: 0;
    padding-bottom: 6px;
    --gutter: 6px 4px 6px 0;
  }
}
</style>
