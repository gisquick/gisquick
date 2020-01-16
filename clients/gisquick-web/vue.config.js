const CompressionPlugin = require('compression-webpack-plugin')

module.exports = {
  publicPath: process.env.NODE_ENV === 'production' ? '/map/' : '/',
  assetsDir: 'static',
  css: {
    extract: process.env.NODE_ENV === 'production' && process.env.CSS_EXTRACT !== 'False'
  },
  configureWebpack: {
    plugins: [new CompressionPlugin()]
  },
  chainWebpack: config => {
    const svgRule = config.module.rule('svg')
    svgRule.uses.clear()

    config.module
      .rule('svg')
      .oneOf('sprite')
      .test(/icons\/.*\.svg$/)
      .use('babel')
      .loader('babel-loader')
      .end()
      .use('svg-sprite')
      .loader('svg-sprite-loader')
      .end()
      .use('svgo')
      .loader('svgo-loader')
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
    proxy: {
      '^/api': {
        target: 'http://localhost'
      }
    }
  }
}
