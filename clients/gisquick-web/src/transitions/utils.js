export function afterHeightTransition (el, cb) {
  var once = (e) => {
    if (e.propertyName === 'height') {
      el.removeEventListener(e.type, once, false)
      cb()
    }
  }
  el.addEventListener('transitionend', once, false)
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
