function clamp (value, min, max) {
  return Math.min(Math.max(value, min), max)
}

function Draggable (elem) {
  return {
    onDragStart (evt) {
      const bounds = elem.getBoundingClientRect()

      const maxX = window.innerWidth - bounds.width
      const maxY = window.innerHeight - bounds.height
      const startX = evt.clientX
      const startY = evt.clientY

      let dragStarted = false
      const onDrag = (evt) => {
        if (!dragStarted) {
          elem.style.position = 'fixed'
          dragStarted = true
        }
        const offX = evt.clientX - startX
        const offY = evt.clientY - startY
        const x = clamp(bounds.left + offX, 0, maxX)
        const y = clamp(bounds.top + offY, 0, maxY)

        elem.style.left = x + 'px'
        elem.style.top = y + 'px'
        // console.log('move', x, y, elem)

        // requestAnimationFrame(() => {
        //   elem.style.transform = `translate3d(${x}px, ${y}px, 0)`
        // })
      }

      const onDragEnd = (evt) => {
        document.removeEventListener('mousemove', onDrag)
        // elem.style.transition = origTransition
      }

      // elem.style.transition = 'none'
      document.addEventListener('mousemove', onDrag)
      document.addEventListener('mouseup', onDragEnd, { once: true })
    }
  }
}

export default Draggable
