import axios from 'axios'
import https from 'https'
import { resolveProjectAppSettings } from './customization'

const HTTP = axios.create({
  withCredentials: true,
  httpsAgent: new https.Agent({
    rejectUnauthorized: false
  })
})

HTTP.login = function (username, password) {
  const params = new FormData()
  params.append('username', username)
  params.append('password', password)
  return HTTP.post('/api/auth/login/', params)
}

HTTP.logout = function () {
  return HTTP.get('/api/auth/logout/')
}

// temporary compatibility with old API
function projectBackwardCompatibility (config) {
  let { projection, projections } = config
  if (!projections) {
    config.projections = { [projection.code]: projection }
  }
  if (typeof projection !== 'string') {
    config.projection = projection.code
  }
  return config
}

HTTP.project = function (project) {
  let extendProject
  if (process.env.NODE_ENV === 'development') {
    const dev = require('@/dev/index.js')
    extendProject = dev.extendProject
  }

  return new Promise((resolve, reject) => {
    const parts = project.split('/').length
    const url = parts === 3
      ? `/api/map/project/?PROJECT=${project}` // old API
      : `/api/map/project/${project}` // new API
    HTTP.get(url)
      .then(resp => {
        let data = projectBackwardCompatibility(extendProject ? extendProject(resp.data) : resp.data)
        try {
          data = resolveProjectAppSettings(data)
        } catch (err) {
          console.error('processing project customization config.', err)
        }
        resolve(data)
      })
      .catch(err => {
        if (err.response?.data.status) {
          reject(err.response.data)
        } else {
          // eslint-disable-next-line prefer-promise-reject-errors
          reject({ status: err?.response.status || 500 })
        }
      })
  })
}

HTTP.CancelToken = axios.CancelToken
HTTP.isCancel = axios.isCancel
export default HTTP
