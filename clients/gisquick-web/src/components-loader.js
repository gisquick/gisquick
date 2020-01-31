const cache = {}
const pending = {}

export async function externalComponent (url, component) {
  if (cache[url]) {
    return cache[url]
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
      resolve(mod.__esModule ? mod.default[component] : mod)
      pending[url].forEach(item => {
        item.resolve(mod.__esModule ? mod.default[item.component] : mod)
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
