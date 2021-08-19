
export default {
  install (Vue) {
    let listeners = []
    let activeListener
    let isSwipe = false
    Vue.prototype.$swiper = {
      bind (listener) {
        listeners.push(listener)
        return () => {
          listeners = listeners.filter(l => l !== listener)
        }
      }
    }

    const onMove  = e => {
      isSwipe = true
      activeListener.move(e)
    }
    const onStart = e => {
      e.stopPropagation()
      activeListener?.start(e)
    }
    const onEnd = e => {
      if (activeListener) {
        activeListener.end(e)
        if (isSwipe) {
          // e.preventDefault()
          e.stopPropagation()
          isSwipe = false
        }
        // document.removeEventListener('touchmove', activeListener.move)
        document.removeEventListener('touchmove', onMove, true)
        document.removeEventListener('touchstart', onStart, true)
      }
    }

    function onPointerDown (e) {
      activeListener = listeners.find(l => l.test(e))
      if (activeListener) {
        e.stopPropagation()
        // e.preventDefault()
        document.addEventListener('touchstart', onStart, true)
        // document.addEventListener('touchmove', activeListener.move)
        document.addEventListener('touchmove', onMove, true)
      }
    }
    document.addEventListener('pointerdown', onPointerDown, true)
    document.addEventListener('touchend', onEnd, true)
  }
}
