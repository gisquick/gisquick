import VectorSource from 'ol/source/Vector'
import VectorLayer from 'ol/layer/Vector'
import Style from 'ol/style/Style'
import Fill from 'ol/style/Fill'
import Stroke from 'ol/style/Stroke'
import Text from 'ol/style/Text'
import Draw from 'ol/interaction/Draw'
import { unByKey } from 'ol/Observable'
import Observable from 'ol/Observable'
import { getArea, getLength } from 'ol/sphere'
import Point from 'ol/geom/Point'
import LineString from 'ol/geom/LineString'
import { linearRingLength } from 'ol/geom/flat/length'
import Collection from 'ol/Collection.js'
import throttle from 'lodash/throttle'
import { simpleStyle } from '@/map/styles'


// OL styling examples
// https://openlayers.org/en/latest/examples/street-labels.html
// https://openlayers.org/en/latest/examples/line-arrows.html

function labelRenderer (pixel, state) {
  const text = state.feature.get('label')
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
  if (state.feature.get('highlighted')) {
    ctx.fillStyle = 'rgb(255, 157, 59)'
  }
  ctx.fill()
  ctx.lineWidth = 1
  ctx.strokeStyle = 'white'
  ctx.stroke()

  ctx.fillStyle = 'rgb(30, 30, 30)'
  ctx.fillText(text, x + 5, y + 16)
  ctx.restore()
}

function createDrawTool (type, style, drawStyle) {
  const source = new VectorSource({ features: new Collection([]) })
  const highlightLayer = new VectorLayer({ source, style, className: 'ol-layer measure' })
  const draw = new Draw({ source, type, style: drawStyle })

  const tool = Object.assign(new Observable(), {
    items: [],
    draw,
    getFeature (id) {
      return source.getFeaturesCollection().getArray().find(f => f.get('id') === id)
    },
    highlight (id) {
      source.getFeaturesCollection().forEach(f => f.set('highlighted', f.get('id') === id))
    },
    getFeatures () {
      return source.getFeaturesCollection().getArray()
    },
    remove (index) {
      this.items.splice(index, 1)
      source.getFeaturesCollection().removeAt(index)
    },
    clear () {
      this.items.splice(0, this.items.length)
      source.clear()
    },
    activate (map) {
      this.map = map
      map.addInteraction(draw)
      // user setMap instead of addLayer for required drawing order
      highlightLayer.setMap(map)
    },
    deactivate () {
      if (this.map) {
        this.map.removeInteraction(draw)
      }
    },
    setVisibility (visible) {
      highlightLayer.setMap(visible ? this.map : null)
    }
  })

  draw.on('drawstart', evt => {
    tool.feature = evt.feature
  })
  draw.on('drawend', evt => {
    tool.feature = evt.feature
  })

  return tool
}

export function LocationMeasure () {
  const normal = simpleStyle({
    radius: 7,
    fill: 'rgb(250, 188, 0)',
    stroke: '#ffffff',
    strokeWidth: 1.5
  })
  const highlighted = simpleStyle({
    radius: 7,
    fill: 'rgb(255, 157, 59)',
    stroke: '#ffffff',
    strokeWidth: 1.5
  })
  const labelStyle = new Style({ renderer: labelRenderer })
  const styleFn = (feature, _) => {
    return [
      feature.get('highlighted') ? highlighted : normal,
      labelStyle
    ]
  }
  const base = createDrawTool('Point', styleFn, [])

  function measure () {
    const coords = base.feature.getGeometry().getCoordinates()
    const proj = base.map.getView().getProjection()
    const [coord1, coord2] = base.format.format(coords, proj)
    const value = {
      id: new Date().getTime(),
      coord1,
      coord2,
      _coords: coords
    }
    base.current = value
    base.items.push(value)
    base.feature.set('label', `${coord1}, ${coord2}`)
    base.feature.set('id', value.id)
  }

  base.draw.on('drawend', measure)
  return Object.assign(base, {
    current: {
      coord1: '',
      coord2: ''
    },
    setFormat (format) {
      this.format = format
      if (this.items.length) {
        const proj = base.map.getView().getProjection()
        this.items.forEach(v => {
          [v.coord1, v.coord2] = format.format(v._coords, proj)
          base.getFeature(v.id).set('label', `${v.coord1}, ${v.coord2}`)
        })
      }
    }
  })
}

export function DistanceMeasure () {
  const normal = [
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
  const highlighted = [
    simpleStyle({
      stroke: '#ffffff',
      strokeWidth: 5.5
    }),
    simpleStyle({
      stroke: 'rgb(255, 157, 59)',
      strokeWidth: 4
    })
  ]
  const styleFn = (feature, _) => {
    const styles = feature.get('highlighted') ? highlighted : normal
    const geom = feature.getGeometry()
    if (geom.getType() !== 'LineString') {
      return styles
    }
    const segmentsStyles = feature.get('data').segments.map(s => new Style({
      geometry: s.geom,
      text: new Text({
        text: s.label,
        font: 'bold 12px "Open Sans", "sans-serif"',
        placement: 'line',
        stroke: new Stroke({
          color: 'black',
          width: 3
        }),
        fill: new Fill({
          color: 'white'
        })
      })
    }))
    return [
      ...styles,
      ...segmentsStyles,
      new Style({
        geometry: (feature) => {
          const geom = feature.getGeometry()
          return new Point(geom.getLastCoordinate())
        },
        renderer: labelRenderer
      })
    ]
  }
  const base = createDrawTool('LineString', styleFn, styleFn)

  function measure () {
    const projection = base.map.getView().getProjection()
    const geom = base.feature.getGeometry()

    const lastSegmentIndex = geom.getCoordinates().length - 2
    let i = 0
    geom?.forEachSegment?.((start, end) => {
      if (!base.current.segments[i] || i === lastSegmentIndex) {
        const segment = new LineString([start, end])
        const length = projection.isGlobal() ? getLength(segment, { projection }) : segment.getLength()
        base.current.segments[i] = {
          length,
          geom: segment,
          label: base.format.length(length)
        }
      }
      i++
    })

    const length = projection.isGlobal() ? getLength(geom, { projection }) : geom.getLength()
    base.current._length = length
    base.current.length = base.format.length(length)
    base.feature.set('label', base.current.length)
  }

  let moveListener, clickListener
  base.draw.on('drawstart', evt => {
    base.current = {
      id: new Date().getTime(),
      length: 0,
      segments: []
    }

    base.items.push(base.current)
    measure()
    base.feature.set('data', base.current)

    moveListener = base.map.on('pointermove', throttle(() => measure(), 30))
  })

  base.draw.on('drawend', () => {
    base.feature.set('id', base.current.id)
    unByKey(moveListener)
    unByKey(clickListener)
  })

  return Object.assign(base, {
    current: null,
    setFormat (format) {
      this.format = format
      if (this.items.length) {
        this.items.forEach(v => {
          v.length = base.format.length(v._length)
          base.getFeature(v.id).set('label', v.length)
          v.segments.forEach(s => {
            s.label = base.format.length(s.length)
          })
        })
      }
    }
  })
}

export function AreaMeasure () {
  const normal = [
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
  const highlighted = [
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
        color: 'rgb(255, 157, 59)',
        width: 4
      })
    })
  ]
  const styleFn = (feature, _) => {
    const geomStyles = feature.get('highlighted') ? highlighted : normal
    if (feature.getGeometry().getType() !== 'Polygon') {
      return geomStyles
    }
    const segmentsStyles = feature.get('data')?.segments.map(s => new Style({
      geometry: s.geom,
      text: new Text({
        text: s.label,
        font: 'bold 11px "Open Sans", "Arial Unicode MS", "sans-serif"',
        placement: 'line',
        stroke: new Stroke({
          color: 'black',
          width: 3
        }),
        fill: new Fill({
          color: 'white'
        })
      })
    }))
    return [
      ...geomStyles,
      ...segmentsStyles,
      new Style({
        geometry: (feature) => {
          const geom = feature.getGeometry()
          if (geom.getType() === 'Polygon') {
            return new Point(geom.getFirstCoordinate())
          }
        },
        renderer: labelRenderer
      })
    ]
  }
  const base = createDrawTool('Polygon', styleFn, styleFn)

  function measure () {
    const projection = base.map.getView().getProjection()
    const geom = base.feature.getGeometry()
    const pointsCount = geom.getLinearRing(0).getCoordinates().length
    if (pointsCount > 3) {
      if (projection.isGlobal()) {
        base.current._area = getArea(geom, { projection })
        base.current._perimeter = getLength(geom, { projection })
      } else {
        base.current._area = geom.getArea()
        base.current._perimeter = linearRingLength(geom.getFlatCoordinates(), 0, pointsCount * 2, 2)
      }
    }

    const line = new LineString(geom.getLinearRing(0).getCoordinates())
    const lastStableIndex = line.getCoordinates().length - 4
    let i = 0
    line.forEachSegment?.((start, end) => {
      if (!base.current.segments[i] || i > lastStableIndex) {
        const segment = new LineString([start, end])
        const length = projection.isGlobal() ? getLength(segment, { projection }) : segment.getLength()
        base.current.segments[i] = {
          length,
          geom: segment,
          label: base.format.length(length)
        }
      }
      i++
    })

    base.current.area = base.format.area(base.current._area ?? 0)
    base.current.perimeter = base.format.length(base.current._perimeter ?? 0)
    base.feature.set('label', base.current.area)
  }

  let moveListener
  base.draw.on('drawstart', evt => {
    base.current = {
      id: new Date().getTime(),
      area: 0,
      perimeter: 0,
      segments: []
    }
    base.items.push(base.current)
    base.feature.set('data', base.current)
    moveListener = base.map.on('pointermove', throttle(() => measure(), 30))
  })

  base.draw.on('drawend', evt => {
    base.feature.set('id', base.current.id)
    base.feature = null
    unByKey(moveListener)
  })

  return Object.assign(base, {
    current: null,
    setFormat (format) {
      this.format = format
      if (this.items.length) {
        this.items.forEach(v => {
          v.perimeter = base.format.length(v._perimeter)
          v.area = base.format.area(v._area)
          base.getFeature(v.id).set('label', v.area)
          v.segments.forEach(s => {
            s.label = base.format.length(s.length)
          })
        })
      }
    }
  })
}
