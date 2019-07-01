import Proj from 'ol/proj'
import Coordinate from 'ol/coordinate'

export function projectionCoordinatesFormatter (projection, precision = 3) {
  return {
    name: `${projection.getCode()} (${projection.getUnits()})`,
    precision: precision,
    format (coords, proj) {
      const units = proj.getUnits()
      return [
        `${coords[0].toFixed(this.precision)} ${units}`,
        `${coords[1].toFixed(this.precision)} ${units}`
      ]
    }
  }
}

export const LocationUnits = [
  {
    name: 'EPSG:4326 (degrees)',
    format (coords, proj) {
      return Proj.toLonLat(coords, proj).map(v => `${v.toFixed(6)} °`).reverse()
    }
  }, {
    name: 'EPSG:4326 (HDMS)',
    format (coords, proj) {
      return Coordinate.toStringHDMS(Proj.toLonLat(coords, proj))
        .replace('N ', 'N;')
        .replace('S ', 'S;')
        .split(';')
    }
  }
]

function formatValue (value, unit) {
  let decimalPlaces
  if (value > 100000) {
    decimalPlaces = 0
  } else if (value > 10000) {
    decimalPlaces = 1
  } else {
    decimalPlaces = 2
  }
  return `${value.toFixed(decimalPlaces)} ${unit}`
}

export const Units = [
  {
    name: 'International - EU',
    length: [
      {
        name: 'Automatic (m/km)',
        length: (value, proj) => value < 1000
          ? formatValue(value, 'm')
          : formatValue(value / 1000, 'km')
      }, {
        name: 'Meters (m)',
        length: (value, proj) => formatValue(value, 'm')
      }, {
        name: 'Kilometers (km)',
        length: (value, proj) => formatValue(value / 1000, 'km')
      }
    ],
    area: [
      {
        name: 'Automatic (m²/km²)',
        area: (value, proj) => value < 1000000
          ? formatValue(value, 'm²')
          : formatValue(value / 1000000, 'km²')
      }, {
        name: 'Square meters (m²)',
        area: (value, proj) => formatValue(value, 'm²')
      }, {
        name: 'Square kilometers (km²)',
        area: (value, proj) => formatValue(value / 1000000, 'km²')
      }, {
        name: 'Hectares (ha)',
        area: (value, proj) => formatValue(value / 10000, 'ha')
      }
    ]
  }, {
    name: 'Imperial - UK, US',
    length: [
      {
        name: 'Automatic (yd/mi)',
        length: (value, proj) => value < 1760
          ? formatValue(value / 0.9144, 'yd')
          : formatValue(value / 1609.344, 'mi')
      }, {
        name: 'Yards (yd)',
        length: (value, proj) => formatValue(value / 0.9144, 'yd')
      }, {
        name: 'Miles (mi)',
        length: (value, proj) => formatValue(value / 1609.344, 'mi')
      }
    ],
    area: [
      {
        name: 'Automatic (sq. yd./acre)',
        area: value => value < 4840
          ? formatValue(value / 0.83612736, 'sq. yd.')
          : formatValue(value / 4046.8564224, 'acre')
      }, {
        name: 'Square yards (sq. yd.)',
        area: value => formatValue(value / 0.83612736, 'sq. yd.')
      }, {
        name: 'Acre',
        area: value => formatValue(value / 4046.8564224, 'acre')
      }
    ]
  }
]
