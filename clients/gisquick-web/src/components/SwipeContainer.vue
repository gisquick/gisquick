<template>
  <div
    class="swipe-content"
    @transitionend.self="transitionend"
  >
    <back-button-listener v-if="visible" @back="hide"/>
    <slot :visible="visible"/>
  </div>
</template>

<script>
import BackButtonListener from '@/ui/BackButtonListener'

const Events = {
  pointerdown: {
    move: 'pointermove',
    end: 'pointerup',
    xPos: e => e.pageX,
    yPos: e => e.pageY
  },
  mousedown: {
    move: 'mousemove',
    end: 'mouseup',
    xPos: e => e.pageX,
    yPos: e => e.pageY
  },
  touchstart: {
    move: 'touchmove',
    end: 'touchend',
    xPos: e => e.touches[0].pageX,
    yPos: e => e.touches[0].pageY
  }
}
const Touch = {
  xPos: e => e.touches[0].pageX,
  yPos: e => e.touches[0].pageY
}

export default {
  components: { BackButtonListener },
  data () {
    return {
      visible: true
    }
  },
  mounted () {
    const el = this.$el
    let wasVisible
    let moveStarted
    let originX
    let offsetX
    let maxOffset

    const unbind = this.$swiper.bind({
      test: e => {
        if (el.parentElement.contains(e.target)) {
          const x = Events[e.type].xPos(e)
          return (this.visible && x > 260 && x < 310) || (!this.visible && x < 20)
        }
      },
      start: e => {
        originX = Touch.xPos(e)
        wasVisible = this.visible
        moveStarted = false
      },
      move: e => {
        offsetX = Touch.xPos(e) - originX
        if (!moveStarted) {
          moveStarted = true
          el.style.display = ''
          el.style.transition = ''
          maxOffset = el.clientWidth
        }
        if (wasVisible) {
          el.style.transform = `translate3d(${Math.min(0, offsetX)}px, 0, 0)`
        } else {
          const op = offsetX < 0 ? '-' : '+'
          const offset = Math.abs(Math.min(maxOffset, offsetX))
          el.style.transform = `translate3d(calc(-100% ${op} ${offset}px), 0, 0)`
        }
      },
      end: e => {
        if ((offsetX < -50 && this.visible) || (offsetX < 100 && !wasVisible)) {
          el.style.transition = 'transform 0.5s cubic-bezier(.25,.8,.5,1)'
          el.style.transform = `translate3d(-100%, 0, 0)`
          this.visible = false
          // console.log('## End -> HIDE')
        }
        if ((wasVisible && Math.abs(offsetX) < 50) || (offsetX > 100 && !wasVisible)) {
          this.visible = true
          el.style.transition = 'transform 0.3s cubic-bezier(.25,.8,.5,1)'
          el.style.transform = 'translate3d(0, 0, 0)'
          // console.log('## End -> OPEN')
        }
      }
    })
    this.$once('hook:beforeDestroy', unbind)
  },
  methods: {
    transitionend (e) {
      if (e.propertyName === 'transform') {
        // console.log('--- transitionend ---')
        const el = e.target
        if (!this.visible) {
          el.style.display = 'none'
        }
        el.style.transition = ''
      }
    },
    hide () {
      this.visible = false
      const el = this.$el
      el.style.transition = 'transform 0.5s cubic-bezier(.25,.8,.5,1)'
      el.style.transform = `translate3d(-100%, 0, 0)`
    }
  }
}
</script>

<style lang="scss" scoped>
.swipe-content {
  transition-timing-function: cubic-bezier(.25,.8,.5,1);
}
</style>
