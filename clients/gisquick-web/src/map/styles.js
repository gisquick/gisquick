import Style from 'ol/style/style'
import Fill from 'ol/style/fill'
import Stroke from 'ol/style/stroke'
import Circle from 'ol/style/circle'

export function simpleStyle (params = {}) {
  let fill, stroke
  if (params.fill) {
    fill = new Fill({
      color: params.fill
    })
  }
  if (params.stroke) {
    const { strokeWidth = 2 } = params
    stroke = new Stroke({
      color: params.stroke,
      width: strokeWidth
    })
  }
  return new Style({
    stroke,
    fill,
    image: new Circle({
      stroke,
      fill,
      radius: params.radius || 8
    })
  })
}

export function highlightedStyle (color) {
  return [
    new Style({
      stroke: new Stroke({
        color: [255, 255, 255, 1],
        width: 5
      })
    }),
    new Style({
      fill: new Fill({
        color: [255, 255, 255, 0.4]
      }),
      stroke: new Stroke({
        color,
        width: 3
      }),
      image: new Circle({
        stroke: new Stroke({
          color: [255, 255, 255, 1],
          width: 2
        }),
        fill: new Fill({
          color
        }),
        radius: 6
      })
    })
  ]
}
