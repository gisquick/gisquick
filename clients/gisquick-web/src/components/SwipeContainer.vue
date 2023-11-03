<template>
  <div
    class="swipe-content"
    @transitionend.self="transitionend"
  >
    <back-button-listener v-if="open" @back="hide"/>
    <slot :visible="visible"/>
    <v-btn
      aria-label="Toggle panel"
      color="#444"
      class="toggle-btn icon"
      :class="{expanded: open}"
      @click="toggle"
      @touchend.prevent=""
    >
      <v-icon name="arrow-right" size="16"/>
    </v-btn>
  </div>
</template>

<script lang="js">
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
      open: true,
      visible: true
    }
  },
  mounted () {
    const el = this.$el
    let wasOpen
    let moveStarted
    let originX
    let offsetX
    let maxOffset

    const unbind = this.$swiper.bind({
      test: e => {
        if (el.parentElement.contains(e.target)) {
          const x = Events[e.type].xPos(e)
          return (this.open && x > 260 && x < 310) || (!this.open && x < 20)
        }
      },
      start: e => {
        originX = Touch.xPos(e)
        wasOpen = this.open
        moveStarted = false
        this.visible = true
      },
      move: e => {
        offsetX = Touch.xPos(e) - originX
        if (!moveStarted) {
          moveStarted = true
          el.style.transition = ''
          maxOffset = el.clientWidth
        }
        if (wasOpen) {
          el.style.transform = `translate3d(${Math.min(0, offsetX)}px, 0, 0)`
        } else {
          const op = offsetX < 0 ? '-' : '+'
          const offset = Math.abs(Math.min(maxOffset, offsetX))
          el.style.transform = `translate3d(calc(-100% ${op} ${offset}px), 0, 0)`
        }
      },
      end: e => {
        if (!moveStarted) {
          return
        }
        if ((offsetX < -50 && this.open) || (offsetX < 100 && !wasOpen)) {
          el.style.transition = 'transform 0.5s cubic-bezier(.25,.8,.5,1)'
          el.style.transform = 'translate3d(-100%, 0, 0)'
          this.open = false
          // console.log('## End -> HIDE')
        }
        if ((wasOpen && Math.abs(offsetX) < 50) || (offsetX > 100 && !wasOpen)) {
          this.open = true
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
        this.visible = this.open
        el.style.transition = ''
      }
    },
    hide () {
      this.open = false
      const el = this.$el
      el.style.transition = 'transform 0.5s cubic-bezier(.25,.8,.5,1)'
      el.style.transform = 'translate3d(-100%, 0, 0)'
    },
    toggle () {
      if (this.open) {
        this.hide()
      } else {
        this.open = true
        const el = this.$el
        el.style.transition = 'transform 0.5s cubic-bezier(.25,.8,.5,1)'
        el.style.transform = 'translate3d(0, 0, 0)'
      }
    }
  }
}
</script>

<style lang="scss" scoped>
.swipe-content {
  transition-timing-function: cubic-bezier(.25,.8,.5,1);
  .btn.toggle-btn {
    position: absolute;
    top: calc(50% - 18px);
    right: -25px;
    width: 20px;
    height: 36px;
    border-top-left-radius: 0;
    border-bottom-left-radius: 0;
    &.expanded .icon {
      transform: rotateY(180deg);
    }
  }
}
</style>
