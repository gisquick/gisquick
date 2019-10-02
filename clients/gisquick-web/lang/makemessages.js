const { GettextExtractor, JsExtractors, HtmlExtractors } = require('gettext-extractor')

let extractor = new GettextExtractor()

extractor
  .createJsParser([
    JsExtractors.callExpression('[this].$gettext', {
      arguments: {
        text: 0
      }
    }),
    JsExtractors.callExpression('[this].$pgettext', {
      arguments: {
        context: 0,
        text: 1
      }
    }),
    JsExtractors.callExpression('[this].$ngettext', {
      arguments: {
        text: 0,
        textPlural: 1,
        context: 3
      }
    })
  ])
  .parseFilesGlob('./src/**/*.@(js|vue)')

extractor
  .createHtmlParser([
    HtmlExtractors.elementContent('translate', {
      attributes: {
        textPlural: 'translate-plural',
        context: 'translate-context',
        comment: 'translate-comment'
      }
    })
  ])
  .parseFilesGlob('./src/**/*.vue')

extractor.savePotFile('./lang/messages.pot')

extractor.printStats()
