
<template>
  <div class="scroll-container" style="overflow:auto">
    <slot/>
  </div>
</template>

<style lang="scss" scoped>
.scroll-container {
  overflow: auto;

  // scrollbar-width: none;
  // // mask-image: linear-gradient( black calc(100% - 16px), rgba(0,0,0,0.5) 100%);
  // &::-webkit-scrollbar {
  //   width: 6px;
  // }
  // &::-webkit-scrollbar-track {
  //   background-color: #eee;
  // }
  // &::-webkit-scrollbar-thumb {
  //   color: red;
  //   background-color: #777;
  //   border-radius: 4px;
  //   // border: 1px solid #eee;  /* creates padding around scroll thumb */
  // }
}
</style>
