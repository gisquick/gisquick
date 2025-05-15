export function sanitize (text) {
  return text.replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

export function escapeRegExp (string) {
  return string.replace(/[.*+\-?^${}()|[\]\\]/g, '\\$&')
}

export function removeDiacritics (str) {
  return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
}

function _highlight (text, search, re) {
  const m = re.exec(search)
  if (m) {
    const s = m.index
    const e = s + m[0].length
    return text.substring(0, s) + `<strong>${text.substring(s, e)}</strong>` + _highlight(text.substring(e), search.substring(e), re)
  }
  return text
}

export function textMatcher (query) {
  const re = new RegExp(escapeRegExp(removeDiacritics(query)), 'i')
  return {
    test: text => re.test(removeDiacritics(text)),
    highlight: text => _highlight(text, sanitize(removeDiacritics(text)), re)
  }
}

export function highlight (text, query) {
  text = sanitize(text)
  if (query.length === 0) {
    return text
  }
  const searchText = sanitize(removeDiacritics(text))
  const re = new RegExp(escapeRegExp(removeDiacritics(query)), 'i')
  return _highlight(text, searchText, re)
}
