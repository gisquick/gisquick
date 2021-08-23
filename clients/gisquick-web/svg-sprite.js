const fs = require('fs')
const path = require('path')
const { extendDefaultPlugins, optimize } = require('svgo')
const svg2js = require('svgo/lib/svgo/svg2js')
const js2svg = require('svgo/lib/svgo/js2svg')
const JsAPI = require('svgo/lib/svgo/jsAPI')

const opts = {
  plugins: extendDefaultPlugins([
    { name: 'removeDoctype', active: true },
    { name: 'removeDesc', active: true },
    { name: 'mergePaths', active: true },
    { name: 'removeDimensions', active: true } // important
  ])
}

async function buildSprite (dirPath) {
  const svgs = fs.readdirSync(dirPath)
  const symbols = []
  for (const filename of svgs) {
    const svgPath = path.join(dirPath, filename)
    const data = fs.readFileSync(svgPath, 'utf8') 
    const result = await optimize(data, opts)
    const el = svg2js(result.data)
    const svg = el.children[0]
    svg.name = 'symbol'
    svg.attributes = {
      id: path.basename(filename, '.svg'),
      viewBox: svg.attributes.viewBox
    }
    symbols.push(svg)
  }
  const svg = new JsAPI({
    type: 'root',
    children: [new JsAPI({
      type: 'element',
      name: 'svg',
      attributes: {
        'xmlns': 'http://www.w3.org/2000/svg',
        'xmlns:xlink': 'http://www.w3.org/1999/xlink',
        'width': 0,
        'height': 0,
        'style': 'position: absolute'
      },
      children: [new JsAPI({
        type: 'element',
        name: 'defs',
        children: symbols
      })]
    })]
  })
  return js2svg(svg).data
}

class SpritePlugin {
  constructor(options = {}) {
    this.options = options
  }
  apply(compiler) {
    compiler.hooks
      .compilation
      .tap('SpritePlugin', compilation => {
        if (compilation.hooks.htmlWebpackPluginBeforeHtmlGeneration) {
          compilation.hooks.htmlWebpackPluginBeforeHtmlGeneration
            .tapAsync('SpritePlugin', async (htmlPluginData, callback) => {
              try {
                const svgSprite = await buildSprite(this.options.path)
                htmlPluginData.plugin.options.svgSprite = svgSprite // <%= htmlWebpackPlugin.options.svgSprite %>
                // htmlPluginData.assets.svgSprite = svgSprite // <%= htmlWebpackPlugin.files.svgSprite %>
              } catch (err) {
                console.error(err)
              }
              callback(null, htmlPluginData)
            })
        }
      })
  }
}

module.exports = SpritePlugin
