import path from 'path'

function isAbsoluteUrl (val) {
  return /(https?:\/\/.*\.)/i.test(val)
}

export function resolveProjectCustomizations (project) {
  const { name, customizations } = project
  if (customizations) {
    const url = v => isAbsoluteUrl(v) ? v : path.join('/api/project/media/', name, 'web', 'app', v)
    const urlFields = ['logo', 'text_logo', 'text_logo_dark']
    urlFields.filter(f => customizations[f]).forEach(f => customizations[f] = url(customizations[f]))
  }
  return project
}
