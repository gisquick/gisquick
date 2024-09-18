<template>
  <div class="html-text">{{textValue}}</div>
</template>

<script>

function htmlToText (html) {
  var el = document.createElement('div')
  el.innerHTML = html
  return el.textContent || el.innerText || ''
}

// function htmlToText (html) {
//   return html?.replace(/<[^>]+>/g, '')
// }


// export const TableHtmlWidget = Widget((h, ctx) => (
//   <div {...ctx.data} class="html-widget">
//     <span domPropsInnerHTML={ctx.props.value}></span>
//     <v-tooltip content-class="tooltip light html"><span domPropsInnerHTML={ctx.props.value}></span></v-tooltip>
//   </div>
// ))

export default {
  props: {
    attribute: Object,
    value: String
  },
  computed: {
    textValue () {
      return this.value && htmlToText(this.value)
    }
  }
}
</script>

<style lang="scss" scoped>
.html-text {
  display: block;
  min-height: 0;
  max-height: 22px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
<!-- <style lang="scss">
.tooltip.html {
  .tooltip-box {
    background-color: #fff;
  }
}
</style> -->
