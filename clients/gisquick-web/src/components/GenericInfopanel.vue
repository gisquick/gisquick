<template>
  <div class="grid mx-2">
    <template v-for="(attr, index) in attributes">
      <label :key="attr.name">{{ attr.alias || attr.name }}</label>
      <slot :name="attr.name" :attr="attr">
        <component
          :is="widgets[index]"
          :value="values[index]"
        />
      </slot>
    </template>
  </div>
</template>

<script>
import keyBy from 'lodash/keyBy'

function isUrl (val) {
  return /(https?:\/\/.*\.)/i.test(val)
}

function isImage (val) {
  return val && val.match(/\.(jpeg|jpg|gif|png|svg|tiff)$/i) !== null
}

function isMediaImage (val) {
  return val && val.startsWith('/media/') && isImage(val)
}

function Widget (render) {
  return {
    functional: true,
    props: ['value'],
    render
  }
}

const RawWidget = Widget((h, ctx) => (
  <span>{ctx.props.value}</span>
))

const FloatWidget = Widget((h, ctx) => (
  <span>{ctx.props.value && ctx.props.value.toFixed(2)}</span>
))

const UrlWidget = Widget((h, ctx) => (
  <a href={ctx.props.value} target="_blank">link</a>
))

const ImageWidget = Widget((h, ctx) => (
  <a href={ctx.props.value} target="_blank" class="img"><img src={ctx.props.value}/></a>
))

export default {
  props: {
    layer: Object,
    feature: Object
  },
  computed: {
    attributes () {
      if (this.layer.info_panel_fields) {
        const attrsMap = keyBy(this.layer.attributes, 'name')
        return this.layer.info_panel_fields.map(name => attrsMap[name])
      }
      return this.layer.attributes
    },
    values () {
      return this.attributes.map(attr => this.feature.get(attr.name))
    },
    widgets () {
      return this.attributes.map(attr => {
        const type = attr.type.split('(')[0]
        if (type === 'INTEGER') {
          return RawWidget
        } else if (type === 'DOUBLE') {
          return FloatWidget
        } else if (type === 'TEXT') {
          const value = this.feature.get(attr.name)
          if (isUrl(value)) {
            return isImage(value) ? ImageWidget : UrlWidget
          }
        }
        return RawWidget
      })
    }
  }
}
</script>

<style lang="scss" scoped>
.grid {
  display: grid;
  grid-template-columns: auto auto;
  max-width: 100%;
  label {
    margin: 0 0.75em 0 0;
    font-weight: 500;
    text-overflow: ellipsis;
    white-space: nowrap;
    overflow: hidden;
    min-width: 80px;
    max-width: 150px;
  }
  span {
    color: #555;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  a.img {
    grid-column: 1 / 3;
    img {
      max-width: 100%;
    }
  }
}
</style>
