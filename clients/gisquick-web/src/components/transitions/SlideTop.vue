
<template functional>
  <div>
    <transition name="slide-top" mode="out-in">
      <slot/>
    </transition>
  </div>
</template>

<script>
export default {
  functional: true
}
</script>

<style lang="scss">
.slide-top-enter-active, .slide-top-leave-active {
  transition: transform .4s cubic-bezier(.25,.8,.5,1)!important;
}
.slide-top-enter, .slide-top-leave-to {
  transform: translate3d(0, -110%, 0);
}
</style>
