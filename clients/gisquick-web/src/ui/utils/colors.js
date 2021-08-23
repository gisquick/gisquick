export function hexColor (array) {
  return '#' + array.map(v => v.toString(16).padStart(2, '0')).join('')
}

export function hexToRgb (hex) {
  hex = hex.replace('#', '')
  let alpha = 255
  if (hex.length === 8) {
    alpha = parseInt(hex.slice(6), 16) / 255
    hex = hex.slice(0, 6)
  }
  if (hex.length === 3) {
    const [r, g, b] = hex
    hex = [r, r, g, g, b, b].join('')
  }
  const bigint = parseInt(hex, 16)
  const r = (bigint >> 16) & 255
  const g = (bigint >> 8) & 255
  const b = bigint & 255
  return [r, g, b, alpha]
}

export function colorVars (color, name = 'color') {
  if (color.startsWith('#')) {
    return {
      [`--${name}-rgb`]: hexToRgb(color).join(','),
      [`--${name}`]: color
    }
  }
  return {
    [`--${name}-rgb`]: `var(--color-${color}-rgb)`,
    [`--${name}`]: `var(--color-${color})`
  }
}

export function colorVar (color, name = 'color') {
  if (color.startsWith('#')) {
    return {
      [`--${name}`]: color
    }
  }
  return {
    [`--${name}`]: `var(--color-${color})`
  }
}

export function cssColor (color) {
  const name = color.length === 4 ? 'rgba' : 'rgb'
  return `${name}(${color})`
}

function parseColor (c) {
  if (c.startsWith?.('#')) {
    return hexToRgb(c)
  }
  return c
}
export function interpolate (color1, color2, weight) {
  if (color1.startsWith('#')) {
    color1 = hexToRgb(color1)
  }
  if (color2.startsWith('#')) {
    color2 = hexToRgb(color2)
  }
  const w2 = weight
  const w1 = 1 - w2
  return color1.map((c1, i) => c1 * w1 + color2[i] * w2)
}

export function blend (bg, fg) {
  bg = parseColor(bg)
  fg = parseColor(fg)
  const mix = []
  mix[3] = 1 - (1 - fg[3]) * (1 - bg[3]) // alpha
  mix[0] = Math.round((fg[0] * fg[3] / mix[3]) + (bg[0] * bg[3] * (1 - fg[3]) / mix[3])) // red
  mix[1] = Math.round((fg[1] * fg[3] / mix[3]) + (bg[1] * bg[3] * (1 - fg[3]) / mix[3])) // green
  mix[2] = Math.round((fg[2] * fg[3] / mix[3]) + (bg[2] * bg[3] * (1 - fg[3]) / mix[3])) // blue
  return mix
}