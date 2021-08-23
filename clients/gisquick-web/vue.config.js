const CompressionPlugin = require('compression-webpack-plugin')
const SpritePlugin = require('./svg-sprite.js')

module.exports = {
  lintOnSave: 'warning',
  publicPath: process.env.NODE_ENV === 'production' ? '/map/' : '/',
  assetsDir: 'static',
  css: {
    extract: process.env.NODE_ENV === 'production' && process.env.CSS_EXTRACT !== 'False'
  },
  configureWebpack: {
    plugins: [
      new CompressionPlugin(),
      new SpritePlugin({ path: './icons' })
    ]
  },
  chainWebpack: config => {
    const svgRule = config.module.rule('svg')
    svgRule.uses.clear()

    config.module
      .rule('svg')

      .oneOf('inline-svg')
        .resourceQuery(/inline/)
        .use('babel')
          .loader('babel-loader')
          .end()
        .use('vue-svg-loader')
          .loader('vue-svg-loader')
          .end()
        .end()

      .oneOf('other')
        .use('file-loader')
          .loader('file-loader')
          .options({
            name: 'static/img/[name].[hash:8].[ext]'
          })
          .end()
        .end()
  },
  devServer: {
    before (app) {
      // const npm_argv = JSON.parse(process.env.npm_config_argv).original
      if (process.env.WEBPACK_DEV_SERVER) {
        const ErrorsModule = require('./proxy-interceptors.js')
        app.use('/', ErrorsModule({ config: './proxy-errors.js'}))
      }
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
}
