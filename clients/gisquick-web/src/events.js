export function eventCoord (e) {
  const x = e.clientX || e.touches[0].clientX
  const y = e.clientY || e.touches[0].clientY
  return [x, y]
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
