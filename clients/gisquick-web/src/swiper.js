
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

    function onMove (e) {
      isSwipe = true
      activeListener.move(e)
    }
    function onEnd (e) {
      if (activeListener) {
        activeListener.end(e)
        if (isSwipe) {
          e.preventDefault()
          e.stopPropagation()
          isSwipe = false
        }
        // document.removeEventListener('touchmove', activeListener.move)
        document.removeEventListener('touchmove', onMove)
        document.removeEventListener('touchstart', activeListener.start)
      }
    }

    function onPointerDown (e) {
      activeListener = listeners.find(l => l.test(e))
      if (activeListener) {
        e.stopPropagation()
        e.preventDefault()
        document.addEventListener('touchstart', activeListener.start)
        // document.addEventListener('touchmove', activeListener.move)
        document.addEventListener('touchmove', onMove)
      }
    }
    document.addEventListener('pointerdown', onPointerDown, true)
    document.addEventListener('touchend', onEnd, true)
  }
}
