import path from 'path'
const translations = require.context('./assets/i18n', false, /.*\.json$/)

export default translations.keys().reduce((data, fname) => {
  data[path.basename(fname).replace('.json', '')] = translations(fname)
  return data
}, {})
