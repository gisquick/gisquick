
<template functional>
  <div
    class="scroll-container"
    :class="[data.class, data.staticClass]"
  >
    <slot/>
  </div>
</template>

<script>
export default {
  // functional: true,
  // render (h, ctx) {
  //   return h('div', ctx.data, ctx.children)
  // }
}
</script>

<style lang="scss" scoped>
.scroll-container {
  position: relative;
  display: flex;
  flex-direction: column;
  overflow: auto;
  // min-height: 0;
  // max-height: 100%;
}
</style>
