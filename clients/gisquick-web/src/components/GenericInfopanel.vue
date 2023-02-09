<template>
  <div class="generic-infopanel">
    <div class="fields">
      <template v-for="(attr, index) in fields">
        <span class="label" :key="attr.name">{{ attr.alias || attr.name }}</span>
        <slot :name="attr.name" :attr="attr">
          <component
            :is="widgets[index]"
            :value="values[index]"
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
import path from 'path'

import { valueMapItems } from '@/adapters/attributes'

function isAbsoluteUrl (val) {
  return /(https?:\/\/.*\.)/i.test(val)
}

function Widget (render) {
  return {
    functional: true,
    props: {
      attribute: Object,
      value: {}
    },
    render
  }
}

const RawWidget = Widget((h, ctx) => (
  <span {...ctx.data}>{ctx.props.value}</span>
))

const FloatWidget = Widget((h, ctx) => (
  <span {...ctx.data}>{Number.isFinite(ctx.props.value) ? round(ctx.props.value, 2) : ctx.props.value}</span>
))

export const BoolWidget = Widget((h, ctx) => (
  <div class="f-row-ac" {...ctx.data}><v-icon name={ctx.props.value ? 'check' : 'dash'}/></div>
))

// TODO: translate 'link' (check <translate> component in JSX)
export const UrlWidget = Widget((h, ctx) => (
  ctx.props.value
    ? <translate {...ctx.data} class="hyperlink" tag="a" href={ctx.props.value} target="_blank">link</translate>
    : <span {...ctx.data}/>
))

export const ImageWidget = Widget((h, ctx) => {
  const src = ctx.props.value
  if (!src) {
    return <span class="value"></span>
  }
  return [
    <a class="value" href={src} target="_blank">{src}</a>,
    <v-image class="image" src={src}/>
  ]
})

export function mediaUrl (project, layer, attr) {
  let location = attr.config?.directory || `web/${layer.name}`
  let baseDir = ''
  const relativeDepth = attr.config?.relative_depth ?? 0
  if (relativeDepth) {
    const parts = location.split('/')
    baseDir = parts.slice(0, relativeDepth).join('/')
    location = parts.slice(relativeDepth).join('/')
  }
  return {
    base: path.join('/api/project/media/', project, baseDir),
    location
  }
}

export function mediaUrlFormat (project, layer, attr) {
  const { base } = mediaUrl(project, layer, attr)
  return value => path.join(base, value)
}

export function createImageWidget (createUrl) {
  return Widget((h, ctx) => {
    const src = ctx.props.value
    if (!src) {
      return <span class="value"></span>
    }
    const url = createUrl ? createUrl(src) : src
    return <v-image class="image" src={url} scopedSlots={{
      default: props => (
        <div class="f-row-ac">
          <v-btn class="icon flat m-0">
            <v-icon name="photo" onClick={props.openViewer}/>
            <v-tooltip slot="tooltip" align="ll,rr,c;tt,bb" content-class="tooltip dark image">
              <img style="width:100%; max-width: 300px; max-height:300px" src={`${url}?thumbnail=true`}/>
            </v-tooltip>
          </v-btn>
          <a class="value ml-2" href={url} target="_blank">{src}</a>
        </div>
      )
    }}/>
  })
}

export const DateWidget = Widget((h, ctx) => {
  let { value } = ctx.props
  const cfg = ctx.data.attrs?.attribute?.config
  if (value && cfg && cfg.display_format && cfg.field_format) {
    const date = parse(value, cfg.field_format, new Date())
    try {
      value = format(date, cfg.display_format)
    } catch (err) {
      console.error(`DateWidget: failed to format value: ${value} (${err})`)
    }
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
    try {
      value = format(date, displayFormat)
    } catch (err) {
      console.error(`DateTimeWidget: failed to format value: ${value} (${err})`)
    }
  }
  return <span {...ctx.data}>{value}</span>
})

export const ValueMapWidget = {
  name: 'ValueMapWidget',
  props: {
    attribute: Object,
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

export function createMediaImageWidget (project, layer, attr) {
  const { base } = mediaUrl(project, layer, attr)
  return Widget((h, ctx) => {
    const { value } = ctx.props
    if (!value) {
      return <span class="value"></span>
    }
    const url = path.join(base, value)
    const thumbnailUrl = `${url}?thumbnail=true`
    const srcset = window.devicePixelRatio > 1 ? `${thumbnailUrl} ${Math.min(2, window.devicePixelRatio)}x` : null
    return [
      <a class="value" href={url} target="_blank">{value}</a>,
      <v-image class="image" src={url} srcset={srcset} thumbnail={thumbnailUrl}/>
    ]
  })
}

export default {
  props: {
    feature: Object,
    layer: Object,
    project: Object
  },
  computed: {
    fields () {
      const { attributes, bands, info_panel_fields } = this.layer
      if (attributes) {
        if (info_panel_fields) {
          const attrsMap = keyBy(attributes, 'name')
          return info_panel_fields.map(name => attrsMap[name])
        }
        return attributes
      } else if (bands) {
        return bands.map(name => ({ name, type: 'text' }))
      }
      return []
    },
    values () {
      return this.fields.map(attr => this.feature?.getFormatted(attr.name))
    },
    widgets () {
      return this.fields.map(attr => {
        const type = attr.type.split('(')[0]?.toLowerCase()

        if (attr.widget === 'ValueMap') {
          return ValueMapWidget
        } else if (attr.widget === 'Hyperlink') {
          return UrlWidget
        } else if (attr.widget === 'Image') {
          return ImageWidget
        } else if (attr.widget === 'MediaImage') {
          return createMediaImageWidget(this.project.name, this.layer, attr)
        }
        if (type === 'bool') {
          return BoolWidget
        } else if (type === 'date') {
          return DateWidget
        } else if (type === 'datetime' || type === 'timestamp') {
          return DateTimeWidget
        }
        // old API
        if (type === 'double' || type === 'float') {
          return FloatWidget
        } else if (type === 'text') {
          if (attr.content_type === 'url') {
            return UrlWidget
          } else if (attr.content_type?.startsWith('media;image/')) {
            const value = this.feature?.get(attr.name)
            if (isAbsoluteUrl(value)) {
              return ImageWidget
            }
            return createMediaImageWidget(this.project.name, this.layer, attr)
          }
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
    &:not(.error) {
      background-color: var(--color-dark);
      ::v-deep img {
        border: solid #ddd;
        border-width: 0 0.5px;
      }
      border-radius: 3px;
    }

    // justify-content: end;
    justify-content: center;
    ::v-deep .image-error {
      height: 64px;
      padding: 6px 0;
      justify-self: center;
    }
  }
}
</style>

<style lang="scss">
.tooltip.image {
  .tooltip-box {
    padding: 2px;
  }
}
</style>
