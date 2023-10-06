<script lang="js">
function colorStyle (color) {
  return color.startsWith('#') ? color : `var(--color-${color})`
}

export default {
  functional: true,
  props: {
    name: String,
    color: String,
    size: {
      type: [String, Number],
      default: 20
    }
  },
  render (h, ctx) {
    const { name, color, size } = ctx.props
    ctx.data.staticClass = ctx.data.staticClass ? 'icon ' + ctx.data.staticClass : 'icon'
    ctx.data.attrs = {
      width: size,
      height: size,
      ...ctx.data.attrs
    }
    if (color) {
      const cs = colorStyle(color)
      if (ctx.data.style) {
        ctx.data.style = { fill: cs, ...ctx.data.style }
      } else {
        ctx.data.style = { fill: cs }
      }
    }
    const attrs = {
      'xlink:href': `#${name}`
    }
    const use = h('use', { attrs })
    return h('svg', ctx.data, [use])
  }
}
</script>

<style lang="scss">
.icon {
  flex-shrink: 0;
  box-sizing: content-box;
  // color: var(--icon-color, currentColor);
  &:not([fill]) {
    // fill: currentColor;
    fill: var(--icon-color, currentColor);
  }
}
</style>
