const fs = require('fs')
const path = require('path')
const { optimize } = require('svgo')
const { parseSvg } = require('svgo/lib/parser')
const { stringifySvg } = require('svgo/lib/stringifier')
const HtmlWebpackPlugin = require('html-webpack-plugin')

const opts = {
  plugins: [
    'preset-default',
    { name: 'removeDoctype', active: true },
    { name: 'removeDesc', active: true },
    { name: 'mergePaths', active: true },
    { name: 'removeDimensions', active: true } // important
  ]
}

async function buildSprite (dirPath) {
  const svgs = fs.readdirSync(dirPath)
  const symbols = []
  for (const filename of svgs) {
    const svgPath = path.join(dirPath, filename)
    const data = fs.readFileSync(svgPath, 'utf8') 
    const result = await optimize(data, opts)
    const el = parseSvg(result.data)
    const svg = el.children[0]
    svg.name = 'symbol'
    svg.attributes = {
      id: path.basename(filename, '.svg'),
      viewBox: svg.attributes.viewBox
    }
    symbols.push(svg)
  }
  const data = {
    children: [{
      type: 'element',
      name: 'svg',
      attributes: {
        'xmlns': 'http://www.w3.org/2000/svg',
        'xmlns:xlink': 'http://www.w3.org/1999/xlink',
        'width': 0,
        'height': 0,
        'style': 'position: absolute;'
      },
      children: [{
        type: 'element',
        name: 'defs',
        attributes: {},
        children: symbols
      }]
    }]
  }
  return stringifySvg(data)
}

class SpritePlugin {
  constructor(options = {}) {
    this.options = options
  }
  apply(compiler) {
    compiler.hooks
      .compilation
      .tap('SpritePlugin', compilation => {
        HtmlWebpackPlugin.getHooks(compilation).beforeEmit.tapAsync('SpritePlugin',
          async (data, cb) => {
            const svgSprite = await buildSprite(this.options.path)
            // data.html = data.html.replace('<!-- svg-sprite -->', svgSprite)
            data.html = data.html.replace('<svg-sprite/>', svgSprite)
            cb(null, data)
          }
        )

        // HtmlWebpackPlugin.getHooks(compilation).beforeAssetTagGeneration.tapAsync('SpritePlugin', async (htmlPluginData, callback) => {
        //   try {
        //     const svgSprite = await buildSprite(this.options.path)
        //     htmlPluginData.plugin.options.meta.svgSprite = svgSprite // <%= htmlWebpackPlugin.options.meta.svgSprite %>
        //     // htmlPluginData.plugin.options.svgSprite = svgSprite // <%= htmlWebpackPlugin.options.svgSprite %>
        //     // htmlPluginData.assets.svgSprite = svgSprite // <%= htmlWebpackPlugin.files.svgSprite %>
        //   } catch (err) {
        //     console.error(err)
        //   }
        //   callback(null, htmlPluginData)
        // })
      })
  }
}

module.exports = SpritePlugin
