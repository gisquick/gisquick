const fs = require('fs')
const debounce = require('lodash/debounce')
const bodyParser = require('body-parser')
const querystring = require('querystring')

// Module for simulating errors and other network tweaks useful for development.


const textBodyParser = bodyParser.text()
const jsonBodyParser = bodyParser.json()

function bodyParserMiddleware (req, res) {
  return new Promise(resolve => textBodyParser(req, res, resolve))
}

async function bodyParserMiddleware2 (req, res) {
  await new Promise(resolve => textBodyParser(req, res, resolve))
  await new Promise(resolve => jsonBodyParser(req, res, resolve))
}

function delay (time) {
  return new Promise(resolve => setTimeout(resolve, time))
}

function parseUrl (url) {
  const [pathname, query] = url.split('?')
  return {
    url,
    pathname,
    params: query ? querystring.parse(query) : {},
  }
}

function ErrorsModule (moduleOptions) {
  let proxyErrors = null
  // const modulePath = path.relative(__dirname, moduleOptions.config)
  const filePath = moduleOptions.config

  if (global._fswatcher) {
    global._fswatcher.close()
  }
  if (fs.existsSync(filePath)) {
    // timestamp approach doesn't seems to work on newer Node.js
    // https://github.com/nodejs/modules/issues/307

    // async function readConfig () {
    //   const timestamp = new Date().getTime()
    //   try {
    //     const mod = await import(`${filePath}?t=${timestamp}`)
    //     console.log('## readConfig', `${filePath}?t=${timestamp}`)
    //     proxyErrors = mod.default
    //     console.log(proxyErrors)
    //   } catch (err) {
    //     console.error('Invalid proxy errors configuration file')
    //     console.error(err)
    //     proxyErrors = null
    //   }
    // }
    const vm = require('vm')
    var m = require('module')
    const mod = {}
    function readConfig () {
      try {
        const data = fs.readFileSync(filePath, 'utf8')
        vm.runInNewContext(m.wrap(data))({}, require, mod, __filename, __dirname)
        proxyErrors = mod.exports
        // console.log(proxyErrors)
        // console.log('#1', module.exports)
        // vm.runInThisContext(m.wrap(data))(exports, require, module, __filename, __dirname)
        // console.log('#2', module.exports)
        // proxyErrors = module.exports
      } catch (err) {
        console.error('Invalid proxy errors configuration file')
        console.log(err)
        proxyErrors = null
      }
    }
    readConfig()
    global._fswatcher = fs.watch(filePath, debounce(() => readConfig()), 150)
  }

  return async function (req, res, next) {
    if (proxyErrors) {
      const isServer = req.headers['user-agent'].startsWith('axios')
      const isClient = !isServer
      if (req.method === 'POST') {
        await bodyParserMiddleware2(req, res)
      }
      const requestInfo = {
        ...parseUrl(req.url),
        method: req.method,
        body: req.body
      }
      // console.log(requestInfo)
      // const entry = proxyErrors.find(entry =>
      //     entry.url === requestInfo.url ||
      //     (entry.url === requestInfo.pathname && (!entry.test || entry.test(requestInfo)))
      // )
      const entry = proxyErrors.find(entry =>
        (entry.url === requestInfo.url || entry.url === requestInfo.pathname) && (!entry.test || entry.test(requestInfo))
      )
      if (entry) {
        if (!entry.env || (entry.env === 'server' && isServer) || (entry.env === 'client' && isClient)) {
          if (entry.delay) {
            // Delay response
            await delay(entry.delay)
          }
          if (entry.status) {
            res.statusCode = entry.status
            res.end()
            return
          }
        }
      }
    }
    // continue to the next middleware
    next()
  }
}

module.exports = ErrorsModule
