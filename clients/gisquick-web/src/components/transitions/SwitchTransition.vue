<template>
  <!-- <div class="switch-container2" @transitionend.self="onTransitionEnd"> -->
  <div class="switch-container">
    <transition :name="name" v-on="transition">
      <slot/>
    </transition>
  </div>
</template>

<script lang="js">
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

    let leaveTransition
    this.transition = {
      leave: (el) => {
        // console.log('leave', el.clientHeight, el.offsetHeight)
        if (leaveTransition) {
          console.log('overlapping transitions!')
        }
        const leaveHeight = el.offsetHeight
        // this.$el.style.height = el.offsetHeight + 'px'
        leaveTransition = {
          leaveHeight,
          timer: setTimeout(() => {
            this.$el.style.height = leaveHeight + 'px'
            this.$el.classList.add('height-transition')
            nextFrame(() => {
              afterHeightTransition(this.$el, () => {
                this.$el.classList.remove('height-transition')
                this.$el.style.height = ''
              })
              this.$el.style.height = 0
            })
            leaveTransition = null
          })
        }
      },
      enter: (el) => {
        // const height = el.scrollHeight
        let height = el.offsetHeight
        let transitionStarted = false

        let observer // TODO: reuse single ResizeObserver instance
        if (typeof ResizeObserver !== 'undefined') {
          observer = new ResizeObserver(entries => {
            const entry = entries[0]
            const borderBoxSize = Array.isArray(entry.borderBoxSize) ? entry.borderBoxSize[0] : entry.borderBoxSize
            height = Math.round(borderBoxSize.blockSize)
            if (transitionStarted) {
              this.$el.style.height = height + 'px'
            }
          }, { box: 'border-box' })
          observer.observe(el)
        }

        // console.log('enter', el, height)
        let startHeight
        if (leaveTransition) {
          clearTimeout(leaveTransition.timer)
          // leaveTransition = null
          startHeight = leaveTransition.leaveHeight
        } else {
          startHeight = 0
        }
        if (height === startHeight) {
          // console.log('same height!!')
          return
        }
        this.$el.style.height = startHeight + 'px'
        this.$el.classList.add('height-transition')
        nextFrame(() => {
          afterHeightTransition(this.$el, () => {
            if (leaveTransition) {
              leaveTransition = null
            }
            observer?.disconnect()
            this.$el.classList.remove('height-transition')
            this.$el.style.height = ''
          })
          this.$el.style.height = height + 'px'
          transitionStarted = true
        })
      }
    }
  },
  methods: {
    onTransitionEnd () {
      // this.$el.classList.remove('height-transition')
    }
  }
}
</script>

<style lang="scss">
.switch-container {
  display: grid;
  align-items: start; // for dynamic height only
  // overflow: hidden;
  > * {
    grid-area: 1 / 1 / 2 / 2;
  }
}
.switch-enter, .switch-leave-to {
  transform: translate(-30%, 0);
  opacity: 0;
}
.switch-leave, .switch-enter-to {
  transform: translate(0, 0);
  opacity: 1;
}
.switch-enter-active, .switch-leave-active {
  transition: all 0.5s ease;
}
.height-transition {
  will-change: height;
  transition: all 0.5s ease;
  overflow: hidden;
}
</style>
