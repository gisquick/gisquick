<template>
  <div class="generic-infopanel">
    <div class="fields">
      <template v-for="(attr, index) in attributes">
        <span class="label" :key="attr.name">{{ attr.alias || attr.name }}</span>
        <slot :name="attr.name" :attr="attr">
          <component
            :is="widgets[index]"
            :value="values[index]"
            :layer="layer"
            :attribute="attr"
            class="value"
          />
        </slot>
      </template>
    </div>
  </div>
</template>

<script>
import keyBy from 'lodash/keyBy'
import round from 'lodash/round'
import format from 'date-fns/format'
import parse from 'date-fns/parse'
import { valueMapItems } from '@/adapters/attributes'

function isAbsoluteUrl (val) {
  return /(https?:\/\/.*\.)/i.test(val)
}

function Widget (render) {
  return {
    functional: true,
    props: ['value'],
    render
  }
}

const RawWidget = Widget((h, ctx) => (
  <span {...ctx.data}>{ctx.props.value}</span>
))

const FloatWidget = Widget((h, ctx) => (
  <span {...ctx.data}>{Number.isFinite(ctx.props.value) ? round(ctx.props.value, 2) : ctx.props.value}</span>
))

const BoolWidget = Widget((h, ctx) => (
  <div class="f-row-ac" {...ctx.data}><v-icon name={ctx.props.value ? 'check' : 'dash'}/></div>
))

// TODO: translate 'link' (check <translate> component in JSX)
const UrlWidget = Widget((h, ctx) => (
  <a {...ctx.data} href={ctx.props.value} target="_blank">link</a>
))

const ImageWidget = Widget((h, ctx) => {
  const src = ctx.props.value
  if (!src) {
    return <span class="value"></span>
  }
  return [
    <a class="value" href={src} target="_blank">{src}</a>,
    <v-image class="image" src={src}/>
  ]
})

export const DateWidget = Widget((h, ctx) => {
  let { value } = ctx.props
  const cfg = ctx.data.attrs?.attribute?.config
  if (value && cfg && cfg.display_format && cfg.field_format) {
    const date = parse(value, cfg.field_format, new Date())
    value = format(date, cfg.display_format)
  }
  return <span {...ctx.data}>{value}</span>
})

// or define as factory function with attribute as argument?
export const DateTimeWidget = Widget((h, ctx) => {
  let { value } = ctx.props
  if (value) {
    const cfg = ctx.data.attrs?.attribute?.config
    const displayFormat = cfg?.display_format || 'yyyy-MM-dd HH:mm:ss'
    const date = cfg?.field_format ? parse(value, cfg.field_format, new Date()) : new Date(value)
    value = format(date, displayFormat)
  }
  return <span {...ctx.data}>{value}</span>
})

export const ValueMapWidget = {
  name: 'ValueMapWidget',
  props: {
    attribute: Object,
    // layer: Object,
    value: {}
  },
  computed: {
    map () {
      const items = valueMapItems(this.attribute)
      return items.reduce((data, item) => (data[item.value] = item.text, data), {})
    }
  },
  render () {
    return <span>{this.map[this.value]}</span>
  }
}

export default {
  props: {
    feature: Object,
    layer: Object,
    project: Object
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
      return this.attributes.map(attr => this.feature?.getFormatted(attr.name))
    },
    mediaWidget () {
      const root = `/api/project/media/${this.project.name}/`
      return Widget((h, ctx) => {
        if (!ctx.props.value) {
          return <span class="value"></span>
        }
        const url = root + ctx.props.value.replace('media/', '')
        return [
          <a class="value" href={url} target="_blank">{ctx.props.value}</a>,
          <v-image class="image" src={url}/>
        ]
      })
    },
    widgets () {
      return this.attributes.map(attr => {
        const type = attr.type.split('(')[0]?.toLowerCase()
        if (attr.widget === 'ValueMap') {
          return ValueMapWidget
        }
        if (type === 'double' || type === 'float') {
          return FloatWidget
        } else if (type === 'bool') {
          return BoolWidget
        } else if (type === 'TEXT') {
          if (attr.content_type === 'url') {
            return UrlWidget
          } else if (attr.content_type?.startsWith('media;image/')) {
            // TODO: create special content_type for regular image files
            const value = this.feature?.get(attr.name)
            if (isAbsoluteUrl(value)) {
              return ImageWidget
            }
            return this.mediaWidget
          }
        } else if (type === 'date') {
          return DateWidget
        } else if (type === 'datetime' || type === 'TIMESTAMP') {
          return DateTimeWidget
        }
        return RawWidget
      })
    }
  }
}
</script>

<style lang="scss" scoped>
.generic-infopanel {
  padding: 6px;
}
.fields {
  // display: grid;
  display: flex;
  flex-direction: column;
  max-width: 100%;
  background-color: #fafafa;

  padding: 6px 6px;

  .label {
    font-size: 13px;
    // opacity: 0.55;
    font-weight: 500;
    line-height: 1.25;
    text-overflow: ellipsis;
    white-space: nowrap;
    overflow: hidden;
  }
  ::v-deep {
    .value {
      min-height: 28px;
      overflow: hidden;
      text-overflow: ellipsis;
    }
  }
  // ver. 1
  // .label {
  //   font-size: 13px;
  //   font-weight: 500;
  //   line-height: 1.25;
  //   text-overflow: ellipsis;
  //   white-space: nowrap;
  //   overflow: hidden;
  //   color: var(--color-primary);

  // }
  // ::v-deep {
  //   .value {
  //     min-height: 28px;
  //     border: 1px solid;
  //     border-image-slice: 0 0 1 0;
  //     border-image-source: linear-gradient(to right, #ddd 20%, transparent 100%);
  //     // border-bottom: 1px solid #ddd;
  //     // opacity: 0.7;
  //   }
  // }

  span {
    overflow: hidden;
    text-overflow: ellipsis;
  }
  a {
    // grid-column: 1 / 3;
    img {
      max-width: 100%;
    }
  }
  hr {
    opacity: 0.15;
  }
}

// ver. 2
.fields {
  display: grid;
  grid-template-columns: auto 1fr;
  // margin: 6px;
  padding: 0;
  // padding: 6px;
  border: 1px solid #e7e7e7;
  border-width: 1px 1px 0 0;
  border-radius: 4px;
  font-size: 14px;

  .label {
    white-space: initial;
    font-size: 13px;
    padding: 5px;
    text-align: right;
    background-color: #dfdfdf;
    // border-bottom: 1px solid #c7c7c7;
    background-color: #e4e4e4;
    // border-bottom: 1px solid #d0d0d0;
    margin-bottom: 1px;
    border-top-left-radius: 4px;
    border-bottom-left-radius: 4px;
    max-width: 100px;
  }
  ::v-deep {
    .value {
      line-height: 1.35;
      border-bottom: 1px solid #e7e7e7;
      padding: 4px;
    }
  }
  a {
    color: var(--color-primary);
    text-decoration: none;
  }
  .image {
    display: grid;
    // padding: 2px;
    border-bottom: 1px solid #e7e7e7;
    grid-column: 1 / 3;
    width: 100%;

    // align-self: center;
    // justify-self: center;
    ::v-deep .image-error {
      height: 64px;
      padding: 6px 0;
      justify-self: center;
    }
  }
}
</style>
