function createUrl (baseUrl, params = {}, optParams = {}) {
  const url = new URL(baseUrl, location.origin)
  const baseParams = new Set(url.searchParams.keys())
  Object.keys(params).forEach(k => url.searchParams.set(k, params[k]))
  Object.keys(optParams).filter(n => !baseParams.has(n)).forEach(k => url.searchParams.set(k, optParams[k]))
  return url.href
}

export function getWmsLegendUrl (layer) {
  const params = {
    SERVICE: 'WMS',
    REQUEST: 'GetLegendGraphic',
    FORMAT: 'image/png',
    LAYER: layer.source.layers
    // SCALE: Math.round(view.getScale())
  }
  const optParams = {
    VERSION: '1.3.0'
  }
  return createUrl(layer.source.url, params, optParams)
}
