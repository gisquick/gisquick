import has from 'lodash/has'
import keyBy from 'lodash/keyBy'
import mapValues from 'lodash/mapValues'

export function createFormatter (params) {
  let { locale, config } = params
  if (!locale) {
    locale = navigator.language || navigator.languages[0]
    // or (new Intl.NumberFormat()).resolvedOptions().locale
    // https://stackoverflow.com/questions/673905/how-to-determine-users-locale-within-browser
  }
  const nf = new Intl.NumberFormat(locale, config)
  return {
    format: v => Number.isFinite(v) ? nf.format(v) : v
  }
}

function createProjectFormatters (project) {
  const formatters = keyBy(project.config.formatters, 'name')
  return mapValues(formatters, f => createFormatter(f))
}

function _formatFeatures (features, formatters) {
  features.forEach(f => {
    f._formattedProperties = mapValues(formatters, (formetter, name) => formetter.format(f.get(name)))

    Object.defineProperty(f, 'getFormatted', {
      // configurable: true,
      value: function (key) {
        // return this._formattedProperties[key] ?? this.get(key)
        return has(this._formattedProperties, key) ? this._formattedProperties[key] : this.get(key)
      }
    })
    Object.defineProperty(f, 'getFormattedProperties', {
      value: function () {
        return this._formattedProperties
      }
    })
  })
}

export function formatFeatures (project, layer, features) {
  if (!project.formatters) {
    project.formatters = createProjectFormatters(project)
  }
  const layerFormatters = mapValues(
    keyBy(layer.attributes?.filter(attr => attr.format), 'name'),
    attr => project.formatters[attr.format]
  )
  _formatFeatures(features, layerFormatters)
  return features
}
