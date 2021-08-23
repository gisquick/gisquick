export function eventCoord (e) {
  const c = e.touches?.[0] || e
  return [c.clientX, c.clientY]
}

export function touchDistance (e) {
  const t1 = e.touches[0]
  const t2 = e.touches[1]
  return Math.sqrt(Math.pow(t1.pageX - t2.pageX, 2) + Math.pow(t1.pageY - t2.pageY, 2))
}

// export function touchCenter (e) {
//   let x = 0
//   let y = 0
//   const length = e.touches.length
//   for (let i = 0; i < length; i++) {
//     x += e.touches[i].clientX
//     y += e.touches[i].clientY
//   }
//   return [x / length, y / length]
// }

export function touchCenter (e) {
  return [(e.touches[0].clientX + e.touches[1].clientX) / 2, (e.touches[0].clientY + e.touches[1].clientY) / 2]
}

// export function DragHandler1 (e, onStart, onMove, onEnd) {
//   const dragOrigin = eventCoord(e)
//   const moveEvent = e.type === 'mousedown' ? 'mousemove' : 'touchmove'
//   const upEvent = e.type === 'mousedown' ? 'mouseup' : 'touchend'
//   document.addEventListener(moveEvent, onMove, { passive: false })

//   const onDragEnd = evt => {
//     document.removeEventListener(moveEvent, onMove, { passive: false })
//     document.removeEventListener(upEvent, onDragEnd)
//     onEnd?.(evt)
//   }
//   document.addEventListener(upEvent, onDragEnd)
//   onStart?.(dragOrigin)
//   return dragOrigin
// }

export function DragHandler (e, listeners) {
  const dragOrigin = eventCoord(e)
  const moveEvent = e.type === 'mousedown' ? 'mousemove' : 'touchmove'
  const upEvent = e.type === 'mousedown' ? 'mouseup' : 'touchend'
  document.addEventListener(moveEvent, listeners.onMove, { passive: false })

  const onDragEnd = evt => {
    document.removeEventListener(moveEvent, listeners.onMove, { passive: false })
    document.removeEventListener(upEvent, onDragEnd)
    listeners.onEnd?.(evt)
  }
  document.addEventListener(upEvent, onDragEnd)
  listeners.onStart?.(dragOrigin)
  return dragOrigin
}
