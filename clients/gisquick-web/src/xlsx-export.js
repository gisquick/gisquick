import sum from 'lodash/sum'

function valueLength (val) {
  if (val === null || val === undefined) {
    return 0
  }
  if (typeof val === 'string') {
    return val.length
  }
  if (Object.prototype.hasOwnProperty.call(val, 'v')) {
    val = val.v
  }
  return val.toString().length
}

function columnsLengths (header, data) {
  const dataLengths = header
    .map((_, col) => data.map(d => Math.min(valueLength(d[col]), 80)))
    .map(cs => cs.sort((a, b) => a - b).slice(-3)) // sort and select top 3 lengths
    .map(cs => sum(cs) / cs.length) // average vaue of top length
  return header.map((name, col) => Math.ceil(Math.max(dataLengths[col], name.length)))
}

// function columnsMaxLengths (header, data) {
//   const dataLengths = header.map((_, col) => data.map(d => valueLength(d[col])))
//   return header.map((name, col) => Math.max(...dataLengths[col], name.length))
// }

export async function downloadExcel (header, data, sheetname, filename) {
  const xlsx = await import('xlsx/dist/xlsx.mini.min.js')
  const worksheet = xlsx.utils.aoa_to_sheet([header, ...data])
  worksheet['!cols'] = columnsLengths(header, data).map(length => ({ wch: length }))

  const document = xlsx.utils.book_new()
  xlsx.utils.book_append_sheet(document, worksheet, sheetname)
  xlsx.writeFile(document, `${filename}.xlsx`, { compression: true })
}
