export default function heightTransition (duration, timing) {
  const transition = `${duration}ms ${timing}`
  let cancel
  function clearStyle (el) {
    el.style.height = ''
    el.style.transition = ''
    el.style.overflow = ''
    cancel = null
  }
  return {
    beforeEnter (el) {
      if (!cancel) {
        el.style.transition = ''
        el.style.visibility = 'hidden'
        el.style.position = 'absolute'
      }
    },
    enter (el, done) {
      if (cancel) {
        cancel()
      } else {
        el.style.width = parseInt(el.parentElement.offsetWidth) + 'px'

        setTimeout(() => { // wait for vue binding to style element before measuring
          const height = el.offsetHeight
          el.style.height = 0
          el.style.width = ''
          el.style.visibility = ''
          el.style.position = ''
          el.style.overflow = 'hidden'
          el.style.transitionProperty = 'height'

          setTimeout(() => {
            el.style.transition = transition
            el.style.height = height + 'px'
            setTimeout(done, duration)
          }, 30)
          cancel = () => {
            el.style.height = 0
          }
        }, 30)
      }
    },
    afterEnter: clearStyle,
    beforeLeave (el) {
      if (!cancel) {
        el.style.transition = ''
      }
    },
    leave (el) {
      if (cancel) {
        cancel()
      } else {
        const height = el.offsetHeight
        el.style.height = height + 'px'
        el.style.overflow = 'hidden'
        el.style.transition = transition
        setTimeout(() => {
          el.style.height = 0
        }, 30)
        cancel = () => {
          el.style.height = height + 'px'
        }
      }
    },
    afterLeave: clearStyle
  }
}
