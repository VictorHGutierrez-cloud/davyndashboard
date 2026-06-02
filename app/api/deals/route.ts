import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { fetchDeals, fetchComments, parseComment, dealStatus } from '@/lib/introw'

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const [rawDeals, rawComments] = await Promise.all([fetchDeals(), fetchComments()])

  // Build comment map: crmObjectId → merged text
  const commentMap = new Map<string, string[]>()
  for (const c of rawComments) {
    const text = parseComment(c.comment)
    if (!text) continue
    const date = c.createdAt.slice(0, 10)
    const entry = `[${date} – ${c.initiatorEmail}]: ${text}`
    if (!commentMap.has(c.crmObjectId)) commentMap.set(c.crmObjectId, [])
    commentMap.get(c.crmObjectId)!.push(entry)
  }

  const deals = rawDeals.map(d => ({
    id: d.externalId,
    name: d.properties.dealname,
    company: d.companyName ?? '',
    amount: d.properties.amount ? parseFloat(d.properties.amount) : null,
    currency: d.dealCurrencyCode ?? '',
    stage: d.properties.dealstage ?? '',
    pipeline: d.properties.pipeline ?? '',
    closeDate: d.properties.closedate ? d.properties.closedate.slice(0, 10) : null,
    owner: d.properties.hubspot_owner_id ?? '',
    createdBy: d.properties.created_by ?? '',
    status: dealStatus(d.properties.dealstage ?? ''),
    notes: (commentMap.get(d.externalId) ?? []).join('\n\n'),
  }))

  return NextResponse.json(deals, {
    headers: { 'Cache-Control': 's-maxage=300, stale-while-revalidate=60' },
  })
}
