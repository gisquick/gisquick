<template>
  <transition v-on="hooks" :appear="appear">
    <slot/>
  </transition>
</template>

<script lang="js">
import heightTransition from './transitions/height'

export default {
  props: {
    appear: Boolean,
    duration: {
      type: [Number, String],
      default: 350
    },
    timing: {
      type: String,
      default: 'cubic-bezier(.25,.8,.25,1)'
    }
  },
  computed: {
    hooks () {
      return heightTransition(parseInt(this.duration), this.timing)
    }
  }
}
</script>
