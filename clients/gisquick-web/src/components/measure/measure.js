import VectorSource from 'ol/source/Vector'
import VectorLayer from 'ol/layer/Vector'
import { Style, Fill, Circle, Stroke, Text } from 'ol/style'
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


const font = 'bold 13px Calibri,sans-serif'

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

  ctx.font = font
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

function createDrawTool (map, type, style, drawStyle) {
  const source = new VectorSource({ features: new Collection([]) })
  const highlightLayer = new VectorLayer({ source, style, className: 'ol-layer measure' })
  const draw = new Draw({ source, type, style: drawStyle })

  const tool = Object.assign(new Observable(), {
    items: [],
    draw,
    source,
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
    setMap (map) {
      this.map = map
      // used setMap instead of addLayer for required drawing order
      highlightLayer.setMap(map)
    },
    activate () {
      this.map.addInteraction(draw)
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
  tool.setMap(map)
  return tool
}

export function LocationMeasure (map) {
  const drawStyle = new Style({
    image: new Circle({
      fill: new Fill({
        color: 'rgb(250, 188, 0)'
      }),
      radius: 5
    })
  })
  const normal = simpleStyle({
    radius: 7,
    fill: 'rgb(250, 188, 0)',
    stroke: '#ffffff',
    strokeWidth: 1.5,
    radius: 6
  })
  const highlighted = simpleStyle({
    radius: 7,
    fill: 'rgb(255, 157, 59)',
    stroke: '#ffffff',
    strokeWidth: 1.5,
  })
  const labelStyle = new Style({ renderer: labelRenderer })
  const styleFn = (feature, _) => {
    return [
      feature.get('highlighted') ? highlighted : normal,
      labelStyle
    ]
  }
  const base = createDrawTool(map, 'Point', styleFn, drawStyle)

  function createItem (id, feature) {
    const coords = feature.getGeometry().getCoordinates()
    const proj = base.map.getView().getProjection()
    const [coord1, coord2] = base.format.format(coords, proj)
    const value = {
      id,
      coord1,
      coord2,
      _coords: coords
    }
    base.current = value
    base.items.push(value)
    feature.set('label', `${coord1}, ${coord2}`)
    feature.set('id', value.id)
  }

  base.draw.on('drawend', e => createItem(new Date().getTime(), e.feature))
  return Object.assign(base, {
    current: {
      coord1: '',
      coord2: ''
    },
    setFeatures (features) {
      base.source.addFeatures(features)
      features.forEach((feature, i) => {
        createItem(i, feature)
      })
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

export function DistanceMeasure (map) {
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
      }),
      image: new Circle({
        fill: new Fill({
          color: 'rgb(250, 188, 0)'
        }),
        radius: 5
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
        font,
        placement: 'line',
        stroke: new Stroke({
          color: 'white',
          width: 3
        }),
        fill: new Fill({
          color: 'black',
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
  const base = createDrawTool(map, 'LineString', styleFn, styleFn)

  function measure (feature) {
    const data = feature.get('data')
    const projection = base.map.getView().getProjection()
    const geom = feature.getGeometry()

    const lastSegmentIndex = geom.getCoordinates().length - 2
    let i = 0
    geom?.forEachSegment?.((start, end) => {
      if (!data.segments[i] || i === lastSegmentIndex) {
        const segment = new LineString([start, end])
        const length = projection.isGlobal() ? getLength(segment, { projection }) : segment.getLength()
        data.segments[i] = {
          length,
          geom: segment,
          label: base.format.length(length)
        }
      }
      i++
    })

    const length = projection.isGlobal() ? getLength(geom, { projection }) : geom.getLength()
    data._length = length
    data.length = base.format.length(length)
    feature.set('label', data.length)
  }

  let moveListener, clickListener
  base.draw.on('drawstart', evt => {
    base.current = {
      id: new Date().getTime(),
      length: 0,
      segments: []
    }
    base.items.push(base.current)
    evt.feature.set('data', base.current)
    measure(evt.feature)
    moveListener = base.map.on('pointermove', throttle(() => measure(evt.feature), 30))
  })

  base.draw.on('drawend', evt => {
    evt.feature.set('id', base.current.id)
    unByKey(moveListener)
    unByKey(clickListener)
  })

  return Object.assign(base, {
    current: null,
    setFeatures (features) {
      base.items = features.map((feature, i) => {
        const data = {
          id: i,
          length: 0,
          segments: []
        }
        feature.set('data', data)
        feature.set('id', data.id)
        measure(feature)
        return data
      })
      base.source.addFeatures(features)
    },
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
    },
    updateFeature (feature) {
      feature.get('data').segments = []
      measure(feature)
    }
  })
}

export function AreaMeasure (map) {
  const normal = [
    new Style({
      stroke: new Stroke({
        color: '#ffffff',
        width: 5.5
      }),
      fill: new Fill({
        color: 'rgba(255, 255, 255, 0.4)'
      }),
      image: new Circle({
        fill: new Fill({
          color: 'rgb(250, 188, 0)'
        }),
        radius: 5
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
        font,
        placement: 'line',
        stroke: new Stroke({
          color: 'white',
          width: 3
        }),
        fill: new Fill({
          color: 'black',
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
  const base = createDrawTool(map, 'Polygon', styleFn, styleFn)

  function measure (feature) {
    const data = feature.get('data')
    const projection = base.map.getView().getProjection()
    const geom = feature.getGeometry()
    const pointsCount = geom.getLinearRing(0).getCoordinates().length
    if (pointsCount > 3) {
      if (projection.isGlobal()) {
        data._area = getArea(geom, { projection })
        data._perimeter = getLength(geom, { projection })
      } else {
        data._area = geom.getArea()
        data._perimeter = linearRingLength(geom.getFlatCoordinates(), 0, pointsCount * 2, 2)
      }
    }

    const line = new LineString(geom.getLinearRing(0).getCoordinates())
    const lastStableIndex = line.getCoordinates().length - 4
    let i = 0
    line.forEachSegment?.((start, end) => {
      if (!data.segments[i] || i > lastStableIndex) {
        const segment = new LineString([start, end])
        const length = projection.isGlobal() ? getLength(segment, { projection }) : segment.getLength()
        data.segments[i] = {
          length,
          geom: segment,
          label: base.format.length(length)
        }
      }
      i++
    })

    data.area = base.format.area(data._area ?? 0)
    data.perimeter = base.format.length(data._perimeter ?? 0)
    feature.set('label', data.area)
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
    evt.feature.set('data', base.current)
    moveListener = base.map.on('pointermove', throttle(() => measure(evt.feature), 30))
  })

  base.draw.on('drawend', evt => {
    evt.feature.set('id', base.current.id)
    unByKey(moveListener)
  })

  return Object.assign(base, {
    current: null,
    setFeatures (features) {
      base.items = features.map((feature, i) => {
        const data = {
          id: i,
          area: 0,
          perimeter: 0,
          segments: []
        }
        feature.set('data', data)
        feature.set('id', data.id)
        measure(feature)
        return data
      })
      base.source.addFeatures(features)
    },
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
    },
    updateFeature (feature) {
      feature.get('data').segments = []
      measure(feature)
    }
  })
}
