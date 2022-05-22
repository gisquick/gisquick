
import Vue from 'vue'

const cache = {}
const pending = {}

async function getComponent (url, component) {
  if (cache[url]) {
    const mod = cache[url]
    return mod.__esModule ? mod.default.find(c => c.name === component) : mod
  }
  if (pending[url]) {
    return new Promise((resolve, reject) => pending[url].push({ component, resolve, reject }))
  } else {
    pending[url] = []
  }

  return new Promise((resolve, reject) => {
    const name = url.split('/').reverse()[0].match(/^(.*?)\.umd/)[1]
    const script = document.createElement('script')
    script.async = true
    script.addEventListener('load', () => {
      const mod = window[name]
      resolve(mod.__esModule ? mod.default.find(c => c.name === component) : mod)
      pending[url].forEach(item => {
        item.resolve(mod.__esModule ? mod.default.find(c => c.name === item.component) : mod)
      })
      cache[url] = mod
      delete pending[url]
    })
    script.addEventListener('error', () => {
      const err = new Error(`Error loading ${url}`)
      reject(err)
      pending[url].forEach(item => item.reject(err))
      delete pending[url]
    })
    script.src = url
    document.head.appendChild(script)
  })
}

export function externalComponent (project, cname) {
  // check registred components first (used mostly in development mode)
  const cmp = Vue.component(cname)
  if (cmp) {
    return cmp
  }
  const mod = Object.values(project.scripts).find(i => i.components.includes(cname))
  let resource
  if (project.project) { // old API
    const dir = project.project.split('/').slice(0, 2).join('/')
    resource = `/api/project/static/${dir}/${mod.path}`
  } else { // new API
    resource = `/api/project/media/${project.name}/${mod.path}`
  }
  return () => getComponent(resource, cname)
}
