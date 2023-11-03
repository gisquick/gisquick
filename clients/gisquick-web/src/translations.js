import path from 'path'
const translations = import.meta.globEager('./assets/i18n/*.json')

export default Object.keys(translations).reduce((data, fname) => {
  data[path.basename(fname).replace('.json', '')] = translations[fname]
  return data
}, {})
