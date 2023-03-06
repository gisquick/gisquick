const num = new Intl.NumberFormat('en', {
  minimumFractionDigits: 0,
  maximumFractionDigits: 0
})

// const num1 = new Intl.NumberFormat('en', {
//   minimumFractionDigits: 0,
//   maximumFractionDigits: 1
// })

const num2 = new Intl.NumberFormat('en', {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2
})

const ByteSize = {
  GB: value => num2.format(value / 1073741824),
  MB: value => num2.format(value / 1048576),
  kB: value => num.format(value / 1024),
  B: value => num.format(value)
}

export default function formatFileSize (value, unit) {
  if (!value) {
    return value
  }
  if (!unit) {
    if (value >= 1073741824) {
      unit = 'GB'
    } else if (value >= 1048576) {
      unit = 'MB'
    } else if (value >= 1024) {
      unit = 'kB'
    } else {
      unit = 'B'
    }
  }
  return `${ByteSize[unit](value)} ${unit}`
}
