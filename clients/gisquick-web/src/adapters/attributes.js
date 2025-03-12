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
  return attr.config.map.map(obj => {
    const val = Object.values(obj)[0]
    return {
      text: Object.keys(obj)[0],
      value: val === '{2839923C-8B7D-419E-B84B-CA2FE9B80EC7}' ? null : transformValue(val)
    }
  })
}
