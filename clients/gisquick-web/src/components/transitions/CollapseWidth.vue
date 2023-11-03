<template>
  <div>
    <transition :css="false" v-on="transition" mode="out-in">
      <slot/>
    </transition>
  </div>
</template>

<script lang="js">
import { afterWidthTransition } from './utils'

export default {
  created () {
    const nextFrame = (cb) => setTimeout(cb, 30)

    this.transition = {
      beforeLeave: (el) => {
        if (!this.$el.style.width) {
          this.$el.style.width = el.offsetWidth + 'px'
        }
        this.$el.classList.add('collapse-leave', 'collapse-leave-active')
      },
      leave: (el, done) => {
        nextFrame(() => {
          this.$el.classList.remove('collapse-leave')
          this.$el.classList.add('collapse-leave-to')
          afterWidthTransition(this.$el, done)
          this.$el.style.width = 0
        })
      },
      afterLeave: (el) => {
        this.$el.classList.remove('collapse-leave-to', 'collapse-leave-active')
      },
      leaveCancelled: (el) => {
        this.$el.classList.remove('collapse-leave-to', 'collapse-leave-active')
      },
      beforeEnter: (el) => {
        if (this.$el.offsetParent === null) {
          this.$el.style.width = ''
          return // container is not visible => skip animation
        }
        if (!this.$el.style.width) {
          this.$el.style.width = 0
        }
        this.$el.classList.add('collapse-enter', 'collapse-enter-active')
      },
      enter: (el, done) => {
        if (this.$el.offsetParent === null) {
          return // container is not visible => skip animation
        }
        nextFrame(() => {
          this.$el.classList.remove('collapse-enter')
          this.$el.classList.add('collapse-enter-to')
          afterWidthTransition(this.$el, done)
          this.$el.style.width = el.scrollWidth + 'px'
        })
      },
      afterEnter: (el) => {
        this.$el.classList.remove('collapse-enter-to', 'collapse-enter-active')
        this.$el.style.width = ''
      },
      enterCancelled: (el) => {
        this.$el.classList.remove('collapse-enter-to', 'collapse-enter-active')
      }
    }
  }
}
</script>
