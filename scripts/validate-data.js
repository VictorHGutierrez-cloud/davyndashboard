#!/usr/bin/env node
/**
 * Validates public/data.json before deploy.
 * Usage: node scripts/validate-data.js [--strict]
 * Exit 1 if validation fails (--strict enforces 90% fill rates).
 */
const fs = require('fs')
const path = require('path')

const ROOT = path.join(__dirname, '..')
const DATA_PATH = path.join(ROOT, 'public', 'data.json')
const MIN_FILL = 90
const strict = process.argv.includes('--strict')

function pct(n, total) {
  return total ? Math.round((n / total) * 100) : 0
}

function main() {
  if (!fs.existsSync(DATA_PATH)) {
    console.error('FAIL: missing', DATA_PATH)
    process.exit(1)
  }

  let data
  try {
    data = JSON.parse(fs.readFileSync(DATA_PATH, 'utf8'))
  } catch (e) {
    console.error('FAIL: invalid JSON —', e.message)
    process.exit(1)
  }

  const errors = []
  const warnings = []

  if (!data.updatedAt) warnings.push('missing updatedAt')
  if (!data.partner) warnings.push('missing partner')
  if (!Array.isArray(data.deals) || !data.deals.length) {
    errors.push('deals[] missing or empty')
  }

  const deals = data.deals || []
  const n = deals.length
  const ids = new Set()
  deals.forEach(d => {
    if (!d.id) warnings.push('deal without id: ' + (d.name || '?'))
    if (ids.has(d.id)) errors.push('duplicate id: ' + d.id)
    ids.add(d.id)
    if (d.status === 'won' || d.status === 'lost') {
      if (d.isStale) errors.push('closed deal marked stale: ' + d.id)
    }
  })

  const withAmount = deals.filter(d => d.amount != null)
  const amountUsdOk = withAmount.filter(d => typeof d.amountUsd === 'number').length
  const senderOk = deals.filter(d => d.sender).length
  const activityOk = deals.filter(d => d.lastActivityDate).length
  const createOk = deals.filter(d => d.createDate).length

  const rates = {
    sender: pct(senderOk, n),
    lastActivityDate: pct(activityOk, n),
    createDate: pct(createOk, n),
    amountUsd: pct(amountUsdOk, withAmount.length || 1),
  }

  const actions = (data.weeklyBrief && data.weeklyBrief.topActions) || []
  const actionsWithHs = actions.filter(a => a.hubspotUrl).length
  const actionsWithSender = actions.filter(a => a.sender).length

  console.log('Davyn data.json validation')
  console.log('  Path:', DATA_PATH)
  console.log('  updatedAt:', data.updatedAt)
  console.log('  deals:', n)
  console.log('  Fill rates:')
  console.log('    sender:', rates.sender + '%', `(${senderOk}/${n})`)
  console.log('    lastActivityDate:', rates.lastActivityDate + '%', `(${activityOk}/${n})`)
  console.log('    createDate:', rates.createDate + '%', `(${createOk}/${n})`)
  console.log('    amountUsd (of deals with amount):', rates.amountUsd + '%')
  console.log('  topActions:', actions.length, '| hubspotUrl:', actionsWithHs, '| sender:', actionsWithSender)

  if (rates.sender < MIN_FILL) warnings.push(`sender fill ${rates.sender}% < ${MIN_FILL}%`)
  if (rates.lastActivityDate < MIN_FILL) warnings.push(`lastActivityDate fill ${rates.lastActivityDate}% < ${MIN_FILL}%`)
  if (rates.createDate < MIN_FILL) warnings.push(`createDate fill ${rates.createDate}% < ${MIN_FILL}%`)
  if (actions.length && actionsWithHs < actions.length) {
    warnings.push(`topActions missing hubspotUrl: ${actions.length - actionsWithHs}`)
  }

  if (warnings.length) {
    console.log('\nWarnings:')
    warnings.forEach(w => console.log('  -', w))
  }
  if (errors.length) {
    console.log('\nErrors:')
    errors.forEach(e => console.log('  -', e))
    process.exit(1)
  }

  if (strict && warnings.some(w => w.includes('fill') && w.includes('<'))) {
    console.error('\nFAIL (--strict): data quality below', MIN_FILL + '%')
    process.exit(1)
  }

  console.log('\nOK: data.json is valid' + (strict ? ' (strict)' : ''))
}

main()
