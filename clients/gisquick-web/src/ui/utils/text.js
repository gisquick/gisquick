export function sanitize (text) {
  return text.replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

export function escapeRegExp (string) {
  return string.replace(/[.*+\-?^${}()|[\]\\]/g, '\\$&')
}

export function removeDiacritics (str) {
  return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
}
