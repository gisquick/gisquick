
import GML3 from 'ol/format/GML3'

function OrOperator (filters) {
  return '<ogc:Or>' + filters.join('\n') + '</ogc:Or>'
}

function AndOperator (filters) {
  return '<ogc:And>' + filters.join('\n') + '</ogc:And>'
}

function SimpleFilter (name) {
  return (attribute, value) => {
    if (value === null) {
      if (name === 'PropertyIsEqualTo') {
        return IsNullFilter(attribute)
      } else if (name === 'PropertyIsNotEqualTo') {
        return IsNotNullFilter(attribute)
      }
    }
    return `
    <ogc:${name}>
      <ogc:PropertyName>${attribute}</ogc:PropertyName>
      <ogc:Literal>${value}</ogc:Literal>
    </ogc:${name}>`
  }
}

function LikeFilter (attribute, value) {
  const literal = value.includes('%') ? value : `%${value}%`
  return `
    <ogc:PropertyIsLike wildCard="%" singleChar="_" escapeChar="\\" matchCase="false">
      <ogc:PropertyName>${attribute}</ogc:PropertyName>
      <ogc:Literal>${literal}</ogc:Literal>
    </ogc:PropertyIsLike>`
}

function InFilter (attribute, value) {
  const values = Array.isArray(value) ? value : value.split(',').map(v => v.trim())
  const items = values.map(v => SimpleFilter('PropertyIsEqualTo')(attribute, v))
  return items.length > 1 ? OrOperator(items) : items[0]
}

function NotInFilter (attribute, value) {
  const values = Array.isArray(value) ? value : value.split(',').map(v => v.trim())
  const items = values.map(v => SimpleFilter('PropertyIsNotEqualTo')(attribute, v))
  return items.length > 1 ? AndOperator(items) : items[0]
}

function BetweenFilter (attribute, lower, upper) {
  return `
    <ogc:PropertyIsBetween>
      <ogc:PropertyName>${attribute}</ogc:PropertyName>
      <ogc:LowerBoundary><ogc:Literal>${lower}</ogc:Literal></ogc:LowerBoundary>
      <ogc:UpperBoundary><ogc:Literal>${upper}</ogc:Literal></ogc:UpperBoundary>
    </ogc:PropertyIsBetween>`
}

function IsNullFilter (attribute) {
  return `
    <ogc:PropertyIsNull>
      <ogc:PropertyName>${attribute}</ogc:PropertyName>
    </ogc:PropertyIsNull>`
}

function IsNotNullFilter (attribute) {
  return `
    <ogc:Not>
      <ogc:PropertyIsNull>
        <ogc:PropertyName>${attribute}</ogc:PropertyName>
      </ogc:PropertyIsNull>
    </ogc:Not>`
}

const AttributeFilters = {
  'DATE_EQUAL': (attribute, value) => BetweenFilter(attribute, value, value),
  'DATE_BETWEEN': (attribute, value) => BetweenFilter(attribute, value?.since, value?.until),
  // 'SINCE': (attribute, value) => BetweenFilter(attribute, value, 'null'),
  'SINCE': (attribute, value) => BetweenFilter(attribute, value, '9999-12-31'),
  'UNTIL': (attribute, value) => BetweenFilter(attribute, '0', value,),
  '=': SimpleFilter('PropertyIsEqualTo'),
  '!=': SimpleFilter('PropertyIsNotEqualTo'),
  '>': SimpleFilter('PropertyIsGreaterThan'),
  // '>': DateFilter('PropertyIsGreaterThan'),
  '>=': SimpleFilter('PropertyIsGreaterThanOrEqualTo'),
  '<': SimpleFilter('PropertyIsLessThan'),
  // '<': DateFilter('PropertyIsGreaterThan'),
  '<=': SimpleFilter('PropertyIsLessThanOrEqualTo'),
  'LIKE': LikeFilter,
  'IN': InFilter,
  'NOT IN': NotInFilter,
  'BETWEEN': (attr, value) => BetweenFilter(attr, ...value.split(',')),
  'IS NULL': IsNullFilter,
  'IS NOT NULL': IsNotNullFilter
}

// WFS Date filtering
// https://geoserver-users.narkive.com/ZOYYXEHw/ogc-filter-on-datetime-field
// https://stackoverflow.com/questions/23998614/wfs-getfeature-query-with-time-parameter-does-not-filter-in-geoserver

// function DateFilter (name) {
//   return (attribute, value) => `
//     <ogc:${name}>
//       <ogc:PropertyName>${attribute}</ogc:PropertyName>
//       <ogc:Function name="dateParse">
//         <ogc:Literal>yyyy-MM-dd</ogc:Literal>
//         <ogc:Literal>${value}</ogc:Literal>
//       </ogc:Function>
//     </ogc:${name}>`
// }

// const testQuery = `
// <ogc:PropertyIsBetween>
// <ogc:PropertyName>datetime</ogc:PropertyName>
// <ogc:LowerBoundary>
// <ogc:Literal>2006-12-14T12:08:13</ogc:Literal>
// </ogc:LowerBoundary>
// <ogc:UpperBoundary>
// <ogc:Literal>2026-12-14T12:08:13</ogc:Literal>
// </ogc:UpperBoundary>
// </ogc:PropertyIsBetween>`

// const testQuery = `
// <ogc:PropertyIsBetween>
// <ogc:PropertyName>date</ogc:PropertyName>
// <ogc:LowerBoundary>
// <ogc:Literal>2006-12-14</ogc:Literal>
// </ogc:LowerBoundary>
// <ogc:UpperBoundary>
// <ogc:Literal>2026-12-14</ogc:Literal>
// </ogc:UpperBoundary>
// </ogc:PropertyIsBetween>`

// const testQuery = `
// <ogc:PropertyIsGreaterThan>
// <ogc:PropertyName>datetime</ogc:PropertyName>
// <ogc:Literal>2006-12-14T12:08:13</ogc:Literal>
// </ogc:PropertyIsGreaterThan>`

// const testQuery = `
// <ogc:PropertyIsNull>
// <ogc:PropertyName>date</ogc:PropertyName>
// </ogc:PropertyIsNull>
// `

export function formatLayerQuery (layer, params) {
  const { geom, filters, propertyNames = [], sortBy } = params

  const ogcFilters = []
  if (geom) {
    const gmlGeom = new GML3({
      // QGIS WFS doesn't seems to work with multiSurface
      multiSurface: false,
      multiCurve: false
    }).writeGeometryNode(geom).innerHTML
    const geomFilter = `
      <ogc:Intersects>
        <ogc:PropertyName>geometry</ogc:PropertyName>
        ${gmlGeom}
      </ogc:Intersects>`
    ogcFilters.push(geomFilter)
  }
  if (filters) {
    ogcFilters.push(...filters.map(f => AttributeFilters[f.operator](f.attribute, f.value)))
  }
  let rootFilter = ''
  if (ogcFilters.length > 0) {
    rootFilter = ogcFilters.length > 1 ? AndOperator(ogcFilters) : ogcFilters[0]
    rootFilter = `<ogc:Filter xmlns:ogc="http://www.opengis.net/ogc">${rootFilter}</ogc:Filter>`
  }
  let sort = ''
  if (sortBy) {
    sort = `<ogc:SortBy><ogc:SortProperty><ogc:PropertyName>${sortBy.property}</ogc:PropertyName><ogc:SortOrder>${sortBy.order}</ogc:SortOrder></ogc:SortProperty></ogc:SortBy>`
  }
  return [
    `<wfs:Query typeName="${layer.name.replace(/ /g, '_')}" xmlns:feature="http://www.qgis.org/gml">`,
    propertyNames.map(n => `<ogc:PropertyName>${n}</ogc:PropertyName>`).join('\n'),
    rootFilter,
    sort,
    '</wfs:Query>'
  ].filter(v => v).join('\n')
}

export function getFeatureQuery (...queries) {
  // const d = new DOMParser().parseFromString('<xml>' + query + '</xml>', 'text/xml')
  // console.log(d.documentElement)
  // console.log(new XMLSerializer().serializeToString(d.documentElement))

  // attributes like 'outputFormat' or 'maxFeatures' doesn't seems to have eny effect in GetFeature
  const query = queries.join('\n')
  return [
    '<GetFeature',
    ' xmlns="http://www.opengis.net/wfs"',
    ' xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"',
    ' xmlns:gml="http://www.qgis.org/gml"',
    ' xmlns:ogc="http://www.opengis.net/ogc"',
    '>',
    ` ${query}`,
    '</GetFeature>'
  ].join('\n')
}

export function layerFeaturesQuery (layer, opts) {
  return getFeatureQuery(formatLayerQuery(layer, opts))
}

export function layersFeaturesQuery (layers, opts) {
  const geomsByProj = {}
  if (opts.geomFilter) {
    const { geom, projection } = opts.geomFilter
    if (projection) {
      geomsByProj[projection] = geom
      layers
      .filter(l => l.projection && l.projection !== projection)
      .forEach(l => {
        if (!geomsByProj[l.projection]) {
          geomsByProj[l.projection] = geom.clone().transform(projection, l.projection)
        }
      })
    }
  }
  const hasSharedFilters = Array.isArray(opts.filters)
  const hasSharedProperties = Array.isArray(opts.propertyNames)
  const queries = layers.map(l => formatLayerQuery(l, {
    geom: geomsByProj[l.projection],
    filters: hasSharedFilters ? opts.filters : opts.filters?.[l.name],
    propertyNames: hasSharedProperties ? opts.propertyNames : opts.propertyNames?.[l.name]
  }))
  return getFeatureQuery(...queries)
}
