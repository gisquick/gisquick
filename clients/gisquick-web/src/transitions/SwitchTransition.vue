<template>
  <div class="switch-container">
    <transition :name="name" v-on="transition">
      <slot/>
    </transition>
  </div>
</template>

<script>
import { afterHeightTransition } from './utils'

export default {
  props: {
    name: {
      type: String,
      default: 'switch'
    }
  },
  created () {
    const nextFrame = (cb) => setTimeout(cb, 30)

    this.transition = {
      leave: (el, done) => {
        this.$el.style.height = el.offsetHeight + 'px'
        this.$el.classList.add('switch-active')
        nextFrame(() => {
          afterHeightTransition(this.$el, done)
          this.$el.style.height = 0
        })
      },
      afterLeave: (el) => {
        this.$el.classList.remove('switch-active')
      },
      enter: (el, done) => {
        this.$el.classList.add('switch-active')
        nextFrame(() => {
          afterHeightTransition(this.$el, done)
          this.$el.style.height = el.scrollHeight + 'px'
        })
      },
      afterEnter: (el) => {
        this.$el.style.height = ''
        this.$el.classList.remove('switch-active')
        this.$emit('switch-finished')
      }
    }
  }
}
</script>
