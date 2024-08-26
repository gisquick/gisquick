<template>
  <div>
    <slot name="trigger"/>
    <transition name="move" v-on="transition">
      <slot/>
    </transition>
  </div>
</template>

<script>

export default {
  props: {
    target: [String, Function]
  },
  created () {
    const nextFrame = (cb) => setTimeout(cb, 90)

    this.transition = {
      beforeLeave: (el) => {
        const target = this.getTarget() ?? this.$el.children[0]
        const srcRect = el.getBoundingClientRect()
        // console.log('target', target)
        const destRect = target.getBoundingClientRect()
        const scaleX = destRect.width / srcRect.width
        const scaleY = destRect.height / srcRect.height

        // this.parentTransform = el.parentElement.parentElement.style.transform
        // el.parentElement.parentElement.style.transform = ''
        const { position, transform, transformOrigin, top, left } = el.style
        this.origStyle = { position, transform, transformOrigin, top, left }
        el.style.transformOrigin = '0 0'
        el.style.position = 'fixed'
        el.style.top = '0px'
        el.style.left = '0px'
        el.style.transform = `translate(${srcRect.left}px, ${srcRect.top}px) scale(${1}, ${1})`
        this.startLeaveTransform = el.style.transform
        this.endLeaveTransform = `translate(${destRect.left}px, ${destRect.top}px) scale(${scaleX}, ${scaleY})`
        // console.log('leave:', this.startLeaveTransform, this.endLeaveTransform)
      },
      leave: (el) => {
        // el.style.transform = this.endLeaveTransform

        nextFrame(() => {
          el.style.transform = this.endLeaveTransform
        })
        // requestAnimationFrame(() => {
        //   requestAnimationFrame(() => {
        //     el.style.transform = this.endLeaveTransform
        //   })
        // })
      },
      enter: (el) => {
        if (this.startLeaveTransform) {
          // el.style.transform = this.startLeaveTransform
          nextFrame(() => {
            el.style.transform = this.startLeaveTransform
          })
        }
      },
      afterEnter: (el) => {
        for (const [name, style] of Object.entries(this.origStyle)) {
          el.style[name] = style
        }
        // el.parentElement.parentElement.style.transform = this.parentTransform
        // this.startLeaveTransform = null
      }
    }
  },
  methods: {
    getTarget () {
      // const selector = this.$el.getAttribute('target')
      if (this.target) {
        if (typeof this.target === 'string') {
          return document.querySelector(this.target)
        }
        return this.target?.()
      }
    }
  }
}
</script>
