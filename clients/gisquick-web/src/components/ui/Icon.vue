<script>
export default {
  functional: true,
  props: {
    name: String
  },
  render (h, ctx) {
    ctx.data.staticClass = ctx.data.staticClass ? ctx.data.staticClass + ' icon' : 'icon'
    const attrs = {
      'xlink:href': `#${ctx.props.name}`
    }
    const use = h('use', { attrs })
    return h('svg', ctx.data, [use])
  }
}
</script>

<style>
.icon {
  fill: currentColor;
  width: 1.5em;
  height: 1.5em;
}
</style>
