export function afterHeightTransition (el, cb, timeout = 1000) {
  let called = false
  var once = (e) => {
    if (e.propertyName === 'height') {
      el.removeEventListener(e.type, once, false)
      called = true
      cb()
    }
  }
  el.addEventListener('transitionend', once, false)
  if (timeout) {
    setTimeout(() => {
      if (!called) {
        once({ propertyName: 'height', type: 'transitionend' })
      }
    }, timeout)
  }
}

export function afterWidthTransition (el, cb) {
  var once = (e) => {
    if (e.propertyName === 'width') {
      el.removeEventListener(e.type, once, false)
      cb()
    }
  }
  el.addEventListener('transitionend', once, false)
}
