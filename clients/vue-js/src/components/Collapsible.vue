<template>
  <div class="collapsible">
    <transition
      @before-enter="beforeEnter"
      @enter="enter"
      @after-enter="afterEnter"
      @before-leave="beforeLeave"
      @leave="leave">
      <slot></slot>
    </transition>
  </div>
</template>

<script>
/* Container component for animated collapse/expand elements */

export default {
  methods: {
    beforeEnter (el) {
      el.style.display = ''
      el.style.height = el.offsetHeight
    },
    enter (el, done) {
      el.style.height = el.scrollHeight + 'px'
      setTimeout(done, 400)
    },
    afterEnter (el) {
      el.style.height = 'auto'
    },
    beforeLeave (el) {
      el.style.height = el.offsetHeight + 'px'
    },
    leave (el, done) {
      setTimeout(() => {
        el.style.height = 0
        setTimeout(done, 400)
      }, 20)
    }
  }
}
</script>

<style lang="scss">
  .collapsible > * {
    will-change: height;
    transition: height 0.4s ease;
    overflow: hidden;
  }
</style>
