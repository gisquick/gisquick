<template>
  <div>
    <div class="simplebar-track vertical">
      <div class="simplebar-scrollbar"></div>
    </div>
    <div class="simplebar-track horizontal">
      <div class="simplebar-scrollbar"></div>
    </div>
    <div class="simplebar-scroll-content">
      <div class="simplebar-content">
        <slot></slot>
      </div>
    </div>
  </div>
</template>

<script>

import SimpleBar from 'simplebar/dist/simplebar'
import 'simplebar/dist/simplebar.css'

export default {
  mounted () {
    // this.$nextTick(() => new SimpleBar(this.$el))
    setTimeout(() => new SimpleBar(this.$el), 100)
  }
}

</script>

<style lang="scss">
.simplebar-track.vertical {
  .simplebar-scrollbar {
    /*opacity: 0.25;*/
    right: 0;
  }
}
</style>