export default function growTransition (transition) {
  function clearStyle (el) {
    el.style.width = ''
    el.style.height = ''
    // el.style.transition = ''
    // el.style.overflow = ''
    el.children[0].style.width = ''
    el.children[0].style.height = ''

    // el.classList.remove('grow-enter-active', 'grow-leave-active')

    if (parseInt(el.style.minWidth) === state.minWidth?.temp) {
      el.style.minWidth = state.minWidth.orig
    }
  }
  const state = {}
  const baseSize = {
    width: 40 + 'px',
    height: 40 + 'px'
  }
  return {
    name: 'grow',
    beforeEnter (el) {
      // el.style.transition = ''
      el.style.opacity = 0.01
    },
    enter (el) {
      setTimeout(() => { // wait for vue binding to style element before measuring
        // const { width, height } = el.getBoundingClientRect()
        const width = el.offsetWidth
        const height = el.offsetHeight
        state.minWidth = {
          orig: el.style.minWidth,
          temp: 0
        }
        el.children[0].style.width = width + 'px'
        el.children[0].style.height = height + 'px'
        el.style.minWidth = 0
        el.style.width = baseSize.width
        el.style.height = baseSize.height
        // el.style.opacity = 0.01
        // el.style.overflow = 'hidden'
        // el.classList.add('grow-enter-active')

        // el.style.transition = transition
        el.style.transitionProperty = 'width,height,opacity'
        setTimeout(() => {
          el.style.width = width + 'px'
          el.style.height = height + 'px'
          el.style.opacity = 1
        }, 30)
      })
    },
    afterEnter: clearStyle,
    beforeLeave (el) {
      // el.style.transition = ''
    },
    leave (el) {
      const width = el.offsetWidth
      const height = el.offsetHeight
      state.minWidth = {
        orig: el.style.minWidth,
        temp: 0
      }
      el.style.minWidth = 0
      el.style.width = width + 'px'
      el.style.height = height + 'px'
      // el.style.overflow = 'hidden'
      // el.classList.add('grow-leave-active')
      // el.style.transition = transition
      setTimeout(() => {
        el.style.width = baseSize.width
        el.style.height = baseSize.height
        el.style.opacity = 0
      }, 30)
    },
    afterLeave: clearStyle
  }
}
