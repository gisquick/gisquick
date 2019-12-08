import Style from 'ol/style/style'
import Fill from 'ol/style/fill'
import Stroke from 'ol/style/stroke'
import Circle from 'ol/style/circle'

export function createStyle (color) {
  return new Style({
    stroke: new Stroke({
      color: color.concat(0.8),
      width: 2
    }),
    fill: new Fill({
      color: color.concat(0.5)
    }),
    image: new Circle({
      stroke: new Stroke({
        color: color.concat(0.8),
        width: 2
      }),
      fill: new Fill({
        color: color.concat(0.5)
      }),
      radius: 8
    })
  })
}
