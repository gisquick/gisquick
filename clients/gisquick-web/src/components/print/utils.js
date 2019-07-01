import Easing from 'ol/easing'
import Observable from 'ol/observable'

export function mmToPx (value) {
  return parseInt((96 * value) / 25.4)
}

export function createPrintParameters (map, layout, extent, config) {
  const params = {
    'SERVICE': 'WMS',
    'REQUEST': 'GetPrint',
    'TEMPLATE': layout.name,
    'DPI': config.dpi,
    'FORMAT': config.format,
    'SRS': map.getView().getProjection().getCode(),
    'LAYERS': (config.layers || map.overlay.getSource().getVisibleLayers()).join(','),
    'map0:EXTENT': extent.join(','),
    'map0:SCALE': map.getView().getScale(),
    'map0:ROTATION': map.getView().getRotation() * 180 / Math.PI
  }
  if (layout.map.grid) {
    params['map0:GRID_INTERVAL_X'] = layout.map.grid.intervalX
    params['map0:GRID_INTERVAL_Y'] = layout.map.grid.intervalY
  }
  // layout.labels.forEach(label => {
  //   if (label.value) {
  //     params[label.title] = label.value
  //   }
  // })
  return params
}

export function formatCopyrights (copyrights) {
  const formatted = copyrights
    .map(attribution => attribution.getHTML().replace('<a ', '<span ').replace('</a>', '</span>'))
    .join('<span>&nbsp;|&nbsp;</span>')

  const cssStyles = [
    'background-color:rgba(255,255,255,0.75)',
    'position:absolute',
    'bottom:0',
    'right:0',
    'padding-left:8px',
    'padding-right:8px',
    'font-family:Liberation Sans'
  ]
  return `<div style="${cssStyles.join(';')}">${formatted}</div>`
}

export function openPrintWindow (layout, url) {
  // if (url.indexOf('://') === -1) {
  //   url = `${location.protocol}//${location.host}${url}`
  // }
  let popup
  function closePrint () {
    if (popup) {
      popup.close()
    }
  }
  // popup = window.open(url)
  popup = window.open()
  const pageOrientation = (layout.width > layout.height) ? 'landscape' : 'portrait'
  popup.document.head.innerHTML = `
    <style type="text/css" media="print">
      @page {
        size: ${pageOrientation};
        margin: 0;
      }
      html, body {
        margin: 0;
        height: 100%;
      }
      img {
        height: calc(100% - 1px);
      }
    </style>`

  popup.document.body.innerHTML = `<img onload="window.print()" src="${url}"></img>`
  popup.onbeforeunload = closePrint
  popup.onafterprint = closePrint
}

export function scaleAnimation (map, opts) {
  const mapEl = map.getViewport()

  const start = opts.start || Date.now()
  const duration = opts.duration || 450
  const easing = opts.easing || Easing.inAndOut
  const startScale = opts.from
  const endScale = opts.to

  let listener
  const animate = evt => {
    let t = 1
    if (evt.frameState.time < start + duration) {
      t = easing((evt.frameState.time - start) / duration)
    }

    const scale = startScale + (endScale - startScale) * t
    map.setSize([window.innerWidth * scale, window.innerHeight * scale])

    if (t === 1) {
      setTimeout(() => {
        const percScale = 100 * scale + '%'
        mapEl.style.width = percScale
        mapEl.style.height = percScale
        mapEl.style.transform = `scale(${1 / scale}, ${1 / scale})`
      }, 50)
      Observable.unByKey(listener)
    }
  }
  mapEl.style.transformOrigin = 'top left'
  listener = map.on('postcompose', animate)
  map.render()
}
