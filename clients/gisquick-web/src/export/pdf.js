import Vue from 'vue'
import { elementToSVG } from 'dom-to-svg'

import http from '@/client'


function findImageSplitRow (ctx, canvas) {
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
  const pixels = imageData.data // RGBA array
  const width = canvas.width
  const height = canvas.height

  const emptyRows = []

  let end
  // Loop through each row
  for (let y = height - 1; y > 0; y--) {
    let isEmptyRow = true
    const rowStart = y * width
    for (let x = 0; x < width; x++) {
      const index = (rowStart + x) * 4 // Calculate pixel index in RGBA array
      const r = pixels[index]
      const g = pixels[index + 1]
      const b = pixels[index + 2]
      const a = pixels[index + 3]

      // Check if pixel is not white or fully transparent
      if (!(a === 0 || (r === 255 && g === 255 && b === 255 && a === 255))) {
        isEmptyRow = false
        break // Exit loop if a non-white pixel is found
      }
    }
    if (isEmptyRow) {
      if (!end) {
        end = y
      }
    } else if (end) {
      return Math.round((y + end ) / 2)
    }
  }
}

async function encodeCanvas (canvas) {
  return new Promise((resolve, reject) => {
    // Get the image data as a Base64 string
    canvas.toBlob(blob => {
      if (blob) {
        const reader = new FileReader()

        // Read the blob as an ArrayBuffer
        reader.onload = () => {
          const arrayBuffer = reader.result
          const uint8Array = new Uint8Array(arrayBuffer)

          resolve({
            uint8Array: uint8Array,
            arrayBuffer: arrayBuffer
          })
        }

        reader.onerror = reject
        reader.readAsArrayBuffer(blob)
      } else {
        reject(new Error('Failed to create a blob from the canvas.'))
      }
    })
  })
}

export async function getLegendImage (imgElement, maxHeight, offset=0) {
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')
  const width = imgElement.width
  let height = imgElement.height - offset
  canvas.width = width
  if (height > maxHeight) {
    canvas.height = maxHeight
    ctx.drawImage(imgElement, 0, offset, width, maxHeight, 0, 0, width, maxHeight)
    const y = findImageSplitRow(ctx, canvas)
    if (y > 0 && y < maxHeight) {
      canvas.height = y
      ctx.drawImage(imgElement, 0, offset, width, y, 0, 0, width, y)
      const data = await encodeCanvas(canvas)
      return { width, height: canvas.height, data }
    }
  } else {
    canvas.height = height
    ctx.drawImage(imgElement, 0, offset, width, height, 0, 0, width, height)
    const data = await encodeCanvas(canvas)
    return { width, height: canvas.height, data }
  }
}

async function convertImgToBase64 (imgElement, http) {
  const imageUrl = imgElement.src
  if (imageUrl.startsWith(location.origin)) {
    try {
      // Fetch the image as a Blob
      const { data } = await http.get(imageUrl, { responseType: 'blob' })
      // Convert the Blob to Base64
      const base64Data = await new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onloadend = () => resolve(reader.result)
        reader.onerror = reject
        reader.readAsDataURL(data) // Read the Blob as a data URL
      })

      // Replace the `src` with Base64 data
      imgElement.src = base64Data
      return base64Data
    } catch (error) {
      console.error('Failed to convert image to Base64:', error)
      return null
    }
  } else {
    const { data } = await http.get('/api/encode/base64', { params: { url: imageUrl }})
    imgElement.src = data
  }
}

async function preprocessImagesInHtml (htmlElement, http, maxHeight) {
  const imgElements = htmlElement.querySelectorAll('img')
  for (const img of imgElements) {
    if (img.src && !img.src.startsWith('data:')) {
      await convertImgToBase64(img, http) // Convert each image to Base64
    }
    if (maxHeight) {
      img.style.maxHeight = maxHeight + 'px'
    }
  }
  return htmlElement
}

/**
 * Analyzes the html element to find potential split positions.
 * Returns a function to retrieve splits based on given page height and offset.
 * @param {HTMLElement} root - Root HTML element to analyze.
 * @returns {(pageHeight: number, offsetY: number) => number | null} - Function to get the next split.
 */
export function findSplitPositions (root) {
  const textRects = []
  const imageRects = []

  // Collect text rects
  function collectTextRects (element) {
    if (element.nodeType === Node.TEXT_NODE && element.nodeValue.trim()) {
      const range = document.createRange()
      range.selectNodeContents(element)
      textRects.push(...Array.from(range.getClientRects()))
      range.detach()
    } else {
      element.childNodes.forEach(collectTextRects)
    }
  }

  // Collect image rects
  function collectImageRects(element) {
    if (element.tagName === 'IMG') {
      imageRects.push(element.getBoundingClientRect())
    }
    element.childNodes.forEach(collectImageRects)
  }

  collectTextRects(root)
  collectImageRects(root)

  // Check if a split falls inside an image
  const isInImageZone = (y) =>
    imageRects.some(rect => y >= rect.top && y <= rect.bottom)

  // Potential splits from text lines
  let candidateSplits = textRects
    .map(rect => Math.max(0, rect.top - 1))
    .filter((v, i, arr) => arr.indexOf(v) === i)
    .sort((a, b) => a - b)
    .filter(y => !isInImageZone(y))
  candidateSplits.push(root.offsetHeight)

  /**
   * Returns the next safe split position based on pageHeight and offsetY.
   * @param {number} pageHeight - The desired page height.
   * @param {number} offsetY - Current Y offset (start of the page).
   * @returns {number | null} - Next split position or null if none found.
   */
  return (maxHeight, offsetY) => {
    const points = candidateSplits.filter(y => y > offsetY && y - offsetY <= maxHeight)
    return points.length ? Math.max(...points) : null
  }
}

export async function domToSvg (component, props, maxWidth, maxHeight, splitFn, className) {
  const container = document.createElement('div')
  container.style.display = 'grid'
  container.style.position = 'absolute'
  container.style.top = 0
  container.style.left = 0
  container.style.zIndex = -1
  container.style.opacity = 0
  container.style.width = `${maxWidth}px`

  const renderEl = document.createElement('div')
  container.appendChild(renderEl)
  document.body.appendChild(container)

  const comp = await new Promise((resolve) => {
    const vm = new Vue({
      mounted () {
        resolve(vm)
      },
      render (h) {
        return h(component, { props })
      }
    })
    vm.$mount(renderEl)
  })
  const domEl = comp.$el
  comp.$destroy()
  if (className) {
    domEl.classList.add(className)
  }

  await preprocessImagesInHtml(domEl, http, maxHeight - 50)

  const icons = Array.from(domEl.querySelectorAll('use'))
  const defs = document.body.querySelector('svg > defs')
  icons.forEach(i => {
    const s = defs.querySelector(i.getAttribute('xlink:href'))
    const path = s.children[0].cloneNode(true)
    const parent = i.parentElement
    i.remove()
    parent.appendChild(path)
    parent.setAttribute('viewBox', s.getAttribute('viewBox'))
  })

  domEl.style.overflow = 'hidden'
  try {
    const svgs = []
    const segments = splitFn(domEl)

    for (const segment of segments) {
      // clip visible area in html. It's better than captureArea parameter in elementToSVG function
      domEl.style.height = segment.height + 'px'
      domEl.scrollTop = segment.start
      const svgDocument = elementToSVG(domEl)
      svgDocument.querySelectorAll('a[href]').forEach(a => {
        a.setAttribute('xlink:href', a.getAttribute('href'))
        a.removeAttribute('href')
      })
      const svgString = new XMLSerializer().serializeToString(svgDocument)
      svgs.push(svgString)
    }
    return [svgs, segments]
  } finally {
    document.body.removeChild(container)
  }
}
