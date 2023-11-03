<template>
  <transition
    :name="name"
    v-on="transition">
    <div>
      <slot></slot>
    </div>
  </transition>
</template>

<script lang="js">
import { afterHeightTransition } from './utils'

export default {
  props: {
    name: {
      type: String,
      default: 'collapse'
    }
  },
  created () {
    const nextFrame = (cb) => setTimeout(cb, 30)
    this.transition = {
      beforeLeave: (el) => {
        if (!el.style.height) {
          el.style.height = el.offsetHeight + 'px'
        }
      },
      leave: (el, done) => {
        nextFrame(() => {
          afterHeightTransition(el, done)
          el.style.height = 0
        })
      },
      beforeEnter: (el) => {
        if (!el.style.height) {
          el.style.height = 0
        }
      },
      enter: (el, done) => {
        nextFrame(() => {
          afterHeightTransition(el, done)
          el.style.height = el.scrollHeight + 'px'
        })
      },
      afterEnter: (el) => {
        el.style.height = ''
      }
    }
  }
}
</script>
