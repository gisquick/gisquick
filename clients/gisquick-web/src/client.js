import axios from 'axios'
import https from 'https'

const HTTP = axios.create({
  // baseURL: 'http://10.0.2.2:8000',
  withCredentials: true,
  httpsAgent: new https.Agent({
    rejectUnauthorized: false
  })
})

HTTP.login = function (username, password) {
  const params = new FormData()
  params.append('username', username)
  params.append('password', password)
  return HTTP.post('/login/', params)
}

HTTP.logout = function () {
  return HTTP.get('/logout/')
}

HTTP.project = function (project) {
  return HTTP.get(`/project.json?PROJECT=${project}`)
}

export default HTTP
