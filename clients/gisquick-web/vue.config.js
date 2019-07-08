module.exports = {

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
    // proxy: {
    //   context: ['/login', '/project.json'],
    //   target: 'http://localhost:8000'
    // }
    proxy: {
      // '**'
      '/login|/logout|/project.json|/projects.json|/ows|/tile|/filter': {
        target: 'http://localhost:8000'
      }
    }
  }
}
