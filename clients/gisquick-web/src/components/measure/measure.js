import VectorSource from 'ol/source/vector'
import VectorLayer from 'ol/layer/vector'
import Style from 'ol/style/style'
import Fill from 'ol/style/fill'
import Stroke from 'ol/style/stroke'
import Circle from 'ol/style/circle'
import Draw from 'ol/interaction/draw'
import Observable from 'ol/observable'
import Sphere from 'ol/sphere'
import Feature from 'ol/feature'
import Point from 'ol/geom/point'
import LineString from 'ol/geom/linestring'
import olLength from 'ol/geom/flat/length'
import throttle from 'lodash/throttle'

function labelRenderer (pixel, state) {
  const text = state.feature.get('label')
  // console.log('label', text, state.feature)
  if (!text) {
    return
  }
  const ctx = state.context
  ctx.save()
  ctx.translate(pixel[0], pixel[1])
  const pixelRatio = window.devicePixelRatio
  ctx.scale(pixelRatio, pixelRatio)

  ctx.font = 'bold 13px Calibri,sans-serif'
  const tbox = ctx.measureText(text)
  const w = tbox.width + 10
  const h = 25
  const x = -25
  const y = -40
  const r = 4
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.lineTo(x + 30, y + h)
  ctx.lineTo(x + 25, y + h + 4)
  ctx.lineTo(x + 20, y + h)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)

  ctx.fillStyle = 'rgb(250, 188, 0)'
  ctx.fill()
  ctx.lineWidth = 1
  ctx.strokeStyle = 'white'
  ctx.stroke()

  ctx.fillStyle = 'rgb(30, 30, 30)'
  ctx.fillText(text, x + 5, y + 16)
  ctx.restore()
}

function createDrawTool (type, style) {
  const source = new VectorSource()
  const highlightLayer = new VectorLayer({ source, style })
  const draw = new Draw({ source, type })

  const tool = Object.assign(new Observable(), {
    draw,
    createLabel () {
      const labelFeature = new Feature({ geometry: new Point([0, 0]) })
      labelFeature.set('type', 'label')
      source.addFeature(labelFeature)
      labelFeature.setStyle(new Style({ renderer: labelRenderer }))
      return {
        setText (text) {
          labelFeature.set('label', text)
        },
        setCoordinates (coords) {
          labelFeature.getGeometry().setCoordinates(coords)
        }
      }
    },
    activate (map) {
      this.map = map
      map.addInteraction(draw)
      // user setMap instead of addLayer for required drawing order
      highlightLayer.setMap(map)
    },
    deactivate () {
      const map = this.map
      map.removeInteraction(draw)
      highlightLayer.setMap(null)
    }
  })

  draw.on('drawstart', evt => {
    tool.feature = evt.feature
    source.clear()
  })
  draw.on('drawend', evt => {
    tool.feature = evt.feature
  })

  return tool
}

export function LocationMeasure () {
  const style = [
    new Style({
      image: new Circle({
        radius: 7,
        fill: new Fill({
          color: 'rgb(250, 188, 0)'
        }),
        stroke: new Stroke({
          color: '#ffffff',
          width: 1.5
        })
      })
    }),
    new Style({ renderer: labelRenderer })
  ]
  const base = createDrawTool('Point', style)

  function measure () {
    const coords = base.feature.getGeometry().getCoordinates()
    const proj = base.map.getView().getProjection()
    ;[base.coord1, base.coord2] = base.format.format(coords, proj)
    base.feature.set('label', `${base.coord1}, ${base.coord2}`)
  }

  base.draw.on('drawend', evt => measure())

  return Object.assign(base, {
    coord1: '',
    coord2: '',
    setFormat (format) {
      this.format = format
      if (this.feature) {
        measure()
      }
    }
  })
}

export function DistanceMeasure () {
  const style = [
    new Style({
      stroke: new Stroke({
        color: '#ffffff',
        width: 5.5
      })
    }),
    new Style({
      stroke: new Stroke({
        color: 'rgb(250, 188, 0)',
        width: 4
      })
    })
  ]
  const base = createDrawTool('LineString', style)
  let lengthLabel

  function measurePartial () {
    const projection = base.map.getView().getProjection()
    // line coordinates except the last
    const coords = base.feature.getGeometry().getCoordinates().slice(0, -1)
    const partial = new LineString(coords)
    base._partial = projection.isGlobal() ? Sphere.getLength(partial, { projection }) : partial.getLength()
  }

  function measure () {
    const projection = base.map.getView().getProjection()
    const geom = base.feature.getGeometry()
    base._total = projection.isGlobal() ? Sphere.getLength(geom, { projection }) : geom.getLength()

    base.total = base.format.length(base._total)
    base.lastSegment = base.format.length(base._total - base._partial)
    lengthLabel.setText(base.total)
  }

  let moveListener, clickListener
  base.draw.on('drawstart', evt => {
    base._total = 0
    base._partial = 0
    lengthLabel = base.createLabel()
    measure()

    moveListener = base.map.on('pointermove', throttle(e => {
      lengthLabel.setCoordinates(e.coordinate)
      measure()
    }, 30))
    clickListener = base.map.on('click', e => {
      measurePartial()
    })
  })

  base.draw.on('drawend', evt => {
    measurePartial()
    Observable.unByKey(moveListener)
    Observable.unByKey(clickListener)
  })

  return Object.assign(base, {
    total: '',
    lastSegment: '',
    setFormat (format) {
      this.format = format
      if (base.feature) {
        measure()
      }
    }
  })
}

export function AreaMeasure () {
  const style = [
    new Style({
      stroke: new Stroke({
        color: '#ffffff',
        width: 5.5
      }),
      fill: new Fill({
        color: 'rgba(255, 255, 255, 0.4)'
      })
    }),
    new Style({
      stroke: new Stroke({
        color: 'rgb(250, 188, 0)',
        width: 4
      })
    })
  ]
  const base = createDrawTool('Polygon', style)
  let areaLabel

  function measure () {
    const projection = base.map.getView().getProjection()
    const geom = base.feature.getGeometry()
    const pointsCount = geom.getLinearRing(0).getCoordinates().length
    if (pointsCount > 3) {
      if (projection.isGlobal()) {
        base._area = Sphere.getArea(geom, { projection })
        base._perimeter = Sphere.getLength(geom, { projection })
      } else {
        base._area = geom.getArea()
        base._perimeter = olLength.linearRing(geom.getFlatCoordinates(), 0, pointsCount * 2, 2)
      }
    }
    base.area = base.format.area(base._area)
    base.perimeter = base.format.length(base._perimeter)
    areaLabel.setText(base.area)
  }

  let moveListener
  base.draw.on('drawstart', evt => {
    base._area = 0
    base._perimeter = 0
    areaLabel = base.createLabel()
    moveListener = base.map.on('pointermove', throttle(e => {
      areaLabel.setCoordinates(e.coordinate)
      measure()
    }, 30))
  })

  base.draw.on('drawend', evt => {
    Observable.unByKey(moveListener)
  })

  return Object.assign(base, {
    area: '',
    perimeter: '',
    setFormat (format) {
      this.format = format
      if (base.feature) {
        measure()
      }
    }
  })
}
