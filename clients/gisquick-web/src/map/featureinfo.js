
import GML3 from 'ol/format/gml3'

function OrOperator (filters) {
  return '<ogc:Or>' + filters.join('\n') + '</ogc:Or>'
}

function AndOperator (filters) {
  return '<ogc:And>' + filters.join('\n') + '</ogc:And>'
}

function SimpleFilter (name) {
  return (attribute, value) => `
    <ogc:${name}>
      <ogc:PropertyName>${attribute}</ogc:PropertyName>
      <ogc:Literal>${value}</ogc:Literal>
    </ogc:${name}>`
}

function LikeFilter (attribute, value) {
  return `
    <ogc:PropertyIsLike wildCard="%" singleChar="_" escapeChar="\\" matchCase="false">
      <ogc:PropertyName>${attribute}</ogc:PropertyName>
      <ogc:Literal>%${value}%</ogc:Literal>
    </ogc:PropertyIsLike>`
}

function InFilter (attribute, value) {
  const items = value.split(',').map(v => SimpleFilter('PropertyIsEqualTo')(attribute, v))
  return items.length > 1 ? OrOperator(items) : items[0]
}

function BetweenFilter (attribute, value) {
  const [ lower, upper ] = value.split(',')
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
  '=': SimpleFilter('PropertyIsEqualTo'),
  '!=': SimpleFilter('PropertyIsNotEqualTo'),
  '>': SimpleFilter('PropertyIsGreaterThan'),
  '>=': SimpleFilter('PropertyIsGreaterThanOrEqualTo'),
  '<': SimpleFilter('PropertyIsLessThan'),
  '<=': SimpleFilter('PropertyIsLessThanOrEqualTo'),
  'LIKE': LikeFilter,
  'IN': InFilter,
  'BETWEEN': BetweenFilter,
  'IS NULL': IsNullFilter,
  'IS NOT NULL': IsNotNullFilter
}

function _layerFeaturesQuery (layer, geom, filters, propertyNames = []) {
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
  return [
    `<gml:Query gml:typeName="${layer.name.replace(/ /g, '_')}">`,
    propertyNames.map(n => `<ogc:PropertyName>${n}</ogc:PropertyName>`).join('\n'),
    rootFilter,
    '</gml:Query>'
  ].join('\n')
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

export function layerFeaturesQuery (layer, geom, filters, propertyNames = []) {
  return getFeatureQuery(_layerFeaturesQuery(layer, geom, filters, propertyNames))
}

export function layersFeaturesQuery (layers, geomFilter) {
  const { geom, projection } = geomFilter
  const geomsByProj = {
    [projection]: geom
  }
  if (geomFilter) {
    layers
      .filter(l => l.projection !== projection)
      .forEach(l => {
        if (!geomsByProj[l.projection]) {
          geomsByProj[l.projection] = geom.clone().transform(projection, l.projection)
        }
      })
  }
  return getFeatureQuery(...layers.map(l => _layerFeaturesQuery(l, geomsByProj[l.projection])))
}

export function getFeatureByIdQuery (layer, feature) {
  const id = feature.getId().split('.', 2)[1]
  const filter = {
    attribute: layer.pk_attributes[0],
    operator: '=',
    value: id
  }
  return getFeatureQuery(_layerFeaturesQuery(layer, null, [filter]))
}
