const { defineConfig } = require('@vue/cli-service')
const CompressionPlugin = require('compression-webpack-plugin')
const SpritePlugin = require('./svg-sprite.js')

module.exports = defineConfig({
  lintOnSave: 'warning',
  publicPath: process.env.NODE_ENV === 'production' ? '/map/' : '/',
  assetsDir: 'static',
  css: {
    extract: process.env.NODE_ENV === 'production' && process.env.CSS_EXTRACT !== 'False'
  },
  configureWebpack: {
    resolve: {
      fallback: {
        path: require.resolve('path-browserify'),
        https: require.resolve('agent-base')
      }
    },
    plugins: [
      new CompressionPlugin(),
      new SpritePlugin({ path: './icons' })
    ]
  },
  chainWebpack: config => {
    // https://github.com/damianstasik/vue-svg-loader/issues/185
    const svgRule = config.module.rule('svg')

    // Remove regular svg config from root rules list
    config.module.rules.delete('svg')

    config.module.rule('svg')
      // Use svg component rule
      .oneOf('svg_as_component')
        .resourceQuery(/inline/)
        .test(/\.(svg)(\?.*)?$/)
        .use('babel-loader')
          .loader('babel-loader')
          .end()
        .use('vue-svg-loader')
          .loader('vue-svg-loader')
          .end()
        .end()
      // Otherwise use original svg rule
      .oneOf('svg_as_regular')
        .merge(svgRule.toConfig())
        .end()

  },
  devServer: {
    onBeforeSetupMiddleware (devServer) {
      const ErrorsModule = require('./proxy-interceptors.js')
      devServer.app.use('/', ErrorsModule({ config: './proxy-errors.js'}))
    },
    proxy: {
      '^/api': {
        target: 'http://localhost',
        onProxyReq (proxyReq, req) {
          // restream body when body-parser was used
          if (req.body && parseInt(req.headers['content-length']) !== 0) {
            const contentType = proxyReq.getHeader('Content-Type') || ''
            if (contentType.includes('application/json')) {
              const body = JSON.stringify(req.body)
              proxyReq.setHeader('Content-Length', Buffer.byteLength(body))
              proxyReq.write(body)
            } else if (typeof req.body === 'string' || Buffer.isBuffer(req.body)) {
              proxyReq.write(req.body)
            }
          }
        }
      }
    }
  }
})
