import axios from 'axios'
import https from 'https'

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

HTTP.project = function (project) {
  let extendProject
  if (process.env.NODE_ENV === 'development') {
    const dev = require('@/dev/index.js')
    extendProject = dev.extendProject
  }

  return new Promise((resolve, reject) => {
    HTTP.get(`/api/map/project/?PROJECT=${project}`)
      .then(resp => resolve(extendProject ? extendProject(resp.data) : resp.data))
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

export default HTTP
