#!/usr/bin/env node
/**
 * Before replacing public/data.json, archive current file to data.previous.json.
 * Usage:
 *   node scripts/rotate-data.js              # rotate only if data.json exists
 *   node scripts/rotate-data.js path/to/new.json  # rotate then copy new file in
 */
const fs = require('fs')
const path = require('path')

const ROOT = path.join(__dirname, '..')
const CURRENT = path.join(ROOT, 'public', 'data.json')
const PREVIOUS = path.join(ROOT, 'public', 'data.previous.json')
const newFile = process.argv[2]

function main() {
  if (fs.existsSync(CURRENT)) {
    fs.copyFileSync(CURRENT, PREVIOUS)
    console.log('Archived → public/data.previous.json')
  } else {
    console.log('No existing public/data.json to archive')
  }

  if (newFile) {
    const src = path.resolve(newFile)
    if (!fs.existsSync(src)) {
      console.error('FAIL: file not found:', src)
      process.exit(1)
    }
    fs.copyFileSync(src, CURRENT)
    console.log('Installed → public/data.json from', src)
    require('child_process').execSync('node scripts/validate-data.js', { cwd: ROOT, stdio: 'inherit' })
  }
}

main()
