#!/usr/bin/env node
/**
 * Smoke test: parse inline JS in public/index.html (catches duplicate const, etc.)
 */
const fs = require('fs')
const path = require('path')

const HTML_PATH = path.join(__dirname, '..', 'public', 'index.html')

function main() {
  const html = fs.readFileSync(HTML_PATH, 'utf8')
  const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/gi)]
  if (!scripts.length) {
    console.error('FAIL: no <script> blocks in', HTML_PATH)
    process.exit(1)
  }
  scripts.forEach((m, i) => {
    try {
      new Function(m[1])
    } catch (e) {
      console.error(`FAIL: script block ${i} —`, e.message)
      process.exit(1)
    }
  })
  console.log('OK: smoke-html —', scripts.length, 'script block(s) parse cleanly')
}

main()
