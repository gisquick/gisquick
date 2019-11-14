<template>
  <div class="grid">
    <template v-for="(attr, index) in layer.attributes">
      <label :key="attr.name">{{ attr.alias || attr.name }}</label>
      <div
        :key="`val:${attr.name}`"
        :is="widgets[index]"
        :value="values[index]"
      />
    </template>
  </div>
</template>
<script>

function isUrl (val) {
  return /(https?:\/\/.*\.)/i.test(val)
}

function isImage (val) {
  return val.match(/\.(jpeg|jpg|gif|png|svg|tiff)$/i) !== null
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
    values () {
      return this.layer.attributes.map(attr => this.feature.get(attr.name))
    },
    widgets () {
      return this.layer.attributes.map(attr => {
        if (attr.type === 'INTEGER') {
          return RawWidget
        } else if (attr.type === 'DOUBLE') {
          return FloatWidget
        } else if (attr.type === 'TEXT') {
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
  grid-template-columns: minmax(auto, 50%) 1fr;
  max-width: 100%;
  label {
    margin: 0 0.75em 0 0;
    font-weight: 500;
    text-overflow: ellipsis;
    white-space: nowrap;
    overflow: hidden;
  }
  span {
    color: #555;
  }
  a.img {
    grid-column: 1 / 3;
    img {
      max-width: 100%;
    }
  }
}
</style>
