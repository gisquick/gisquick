#!/usr/bin/env node

const fs = require('fs')
const path = require('path')
const compile = require('./gettext-compile.js')

const srcDir = 'i18n'
const destDir = 'src/assets/i18n'

fs.readdirSync(srcDir)
  .filter(p => path.extname(p) === '.po')
  .map(p => path.join(srcDir, p))
  .forEach(file => {
    const name = path.basename(file, '.po')
    const dest = path.join(destDir, `${name}.json`)
    const poContents = fs.readFileSync(file, { encoding: 'utf-8' }).toString()
    const data = compile.po2json(poContents)
    console.log(`generating ${dest}`)
    fs.writeFileSync(dest, JSON.stringify(data.messages))
  })
