<template>
  <v-layout class="column form">
    <template v-for="(attr, index) in layer.attributes">
      <component
        :key="attr.name"
        :is="widgets[index].component"
        :label="attr.alias || attr.name"
        v-model="fields[attr.name]"
        v-bind="widgets[index].props"
        class="mx-2"
      />
    </template>
  </v-layout>
</template>

<script>
import NumberField from './NumberField.vue'

export default {
  props: {
    layer: Object,
    fields: Object,
    readonly: Array
  },
  computed: {
    config () {
      return this.$store.state.project.config
    },
    owsUrl () {
      return this.config.ows_url
    },
    widgets () {
      return this.layer.attributes.map(attr => {
        const disabled = this.readonly && this.readonly.includes(attr.name)
        if (attr.type === 'INTEGER' || attr.type === 'DOUBLE') {
          return {
            component: NumberField,
            props: {
              integer: attr.type === 'INTEGER',
              disabled
            }
          }
        }
        return {
          component: 'v-text-field',
          props: { disabled }
        }
      })
    }
  }
}
</script>

<style lang="scss" scoped>
.form {
  .v-text-field {
    /deep/ {
      .v-input__slot:before {
        border-color: #ccc;
      }
    }
  }
}
</style>
