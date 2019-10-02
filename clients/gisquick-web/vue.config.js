module.exports = {
  outputDir: 'dist/static',
  publicPath: process.env.NODE_ENV === 'production' ? '/static/' : '/',
  pages: process.env.NODE_ENV === 'production'
    ? {
      index: {
        entry: 'src/main.js',
        template: 'index-prod.html',
        filename: '../templates/index.html'
      }
    }
    : undefined,
  css: {
    extract: process.env.NODE_ENV === 'production' && process.env.CSS_EXTRACT !== 'False'
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
        name: 'img/[name].[hash:8].[ext]'
      })
      .end()
      .end()
  },

  devServer: {
    proxy: {
      '^/dev|^/login|^/logout|^/project.json|^/projects.json|^/ows|^/tile|^/legend|^/filter': {
        target: 'http://localhost:8000'
      }
    }
  }
}
