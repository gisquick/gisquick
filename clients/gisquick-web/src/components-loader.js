
import Vue from 'vue'
import store from '@/store'

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

export function externalComponent (name) {
  // check registred components first (used mostly in development mode)
  const cmp = Vue.component(name)
  if (cmp) {
    return cmp
  }
  const { scripts, project } = store.state.project.config
  const mod = Object.values(scripts).find(i => i.components.includes(name))

  // const mod = scripts.find(i => i.components.includes(name))
  const dir = project.split('/').slice(0, 2).join('/')
  const resource = `/api/project/static/${dir}/${mod.path}`
  return () => getComponent(resource, name)
}
