<template>
  <div class="content">
    <div class="fields">
      <template v-for="(attr, index) in attributes">
        <span class="label" :key="attr.name">{{ attr.alias || attr.name }}</span>
        <slot :name="attr.name" :attr="attr">
          <component
            :is="widgets[index]"
            :value="values[index]"
            class="value"
          />
        </slot>
      </template>
    </div>
  </div>
</template>

<script>
import keyBy from 'lodash/keyBy'

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
  <span {...ctx.data}>{ctx.props.value && ctx.props.value.toFixed(2)}</span>
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
      return this.attributes.map(attr => this.feature?.get(attr.name))
    },
    mediaWidget () {
      const projectPath = this.$store.state.project.config.project
      const root = `/api/project/media/${projectPath.substring(0, projectPath.lastIndexOf('/'))}/`
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
        const type = attr.type.split('(')[0]
        if (type === 'INTEGER') {
          return RawWidget
        } else if (type === 'DOUBLE') {
          return FloatWidget
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
        }
        return RawWidget
      })
    }
  }
}
</script>

<style lang="scss" scoped>
.content {
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
