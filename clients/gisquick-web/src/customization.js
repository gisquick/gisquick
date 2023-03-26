import path from 'path'

function isAbsoluteUrl (val) {
  return /(https?:\/\/.*\.)/i.test(val)
}

export function resolveProjectAppSettings (project) {
  const { app, name } = project
  if (app) {
    const url = v => isAbsoluteUrl(v) ? v : path.join('/api/project/media/', name, 'web', 'app', v)
    const urlFields = ['logo', 'text_logo', 'text_logo_dark']
    urlFields.filter(f => app[f]).forEach(f => app[f] = url(app[f]))
  }
  return project
}
