const ConversionFunctions = {
  // new API
  int: v => parseInt(v),
  uint: v => parseInt(v),
  bool: v => Boolean(v),
  float: v => parseFloat(v),
  // old API
  INTEGER: v => parseInt(v),
  DOUBLE: v => parseFloat(v),
  BOOL: v => Boolean(v)
}

export function valueMapItems (attr) {
  const transformValue = ConversionFunctions[attr.type] || (v => v)
  return attr.config.map.map(obj => ({
    text: Object.keys(obj)[0],
    value: transformValue(Object.values(obj)[0])
  }))
}
