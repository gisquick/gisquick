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
  devServer: {
    proxy: {
      '^/api': {
        target: 'http://localhost'
      }
    }
  }
}
