const BASE = 'https://app.introw.io/api'
const PARTNER_ID = process.env.DAVYN_PARTNER_ID ?? 'cmdx78p0600afp901u5r872a1'

function headers() {
  return {
    'Content-Type': 'application/json',
    'x-api-key': process.env.INTROW_API_KEY ?? '',
  }
}

export interface Deal {
  externalId: string
  dealCurrencyCode: string
  companyName: string
  companyDomain: string
  properties: {
    dealname: string
    amount: string | null
    closedate: string | null
    hubspot_owner_id: string | null
    dealstage: string
    pipeline: string
    created_by: string | null
  }
}

export interface Comment {
  id: number
  crmObjectId: string
  createdAt: string
  comment: string
  companyName: string
  initiatorEmail: string
  initiatorType: string
}

export async function fetchDeals(): Promise<Deal[]> {
  const res = await fetch(`${BASE}/crm-objects?objectType=DEAL&partnerId=${PARTNER_ID}&limit=200`, {
    headers: headers(),
    next: { revalidate: 300 }, // cache 5 min
  })
  if (!res.ok) throw new Error(`Introw deals error: ${res.status}`)
  const data = await res.json()
  return Array.isArray(data) ? data : data.data ?? []
}

export async function fetchComments(): Promise<Comment[]> {
  const res = await fetch(
    `${BASE}/partner-engagement?partnerId=${PARTNER_ID}&type=COMMENT&limit=500`,
    { headers: headers(), next: { revalidate: 300 } }
  )
  if (!res.ok) throw new Error(`Introw comments error: ${res.status}`)
  const data = await res.json()
  return Array.isArray(data) ? data : data.data ?? []
}

export function parseComment(raw: string): string {
  try {
    const doc = JSON.parse(raw)
    const texts: string[] = []
    function walk(node: unknown): void {
      if (!node || typeof node !== 'object') return
      const n = node as Record<string, unknown>
      if (n.type === 'text') texts.push(String(n.text ?? ''))
      else if (n.type === 'mention') texts.push(`@${(n.attrs as Record<string,string>)?.label ?? ''}`)
      else if (n.type === 'hardBreak') texts.push('\n')
      Object.values(n).forEach(v => { if (typeof v === 'object') walk(v) })
    }
    walk(doc)
    return texts.join('').trim()
  } catch {
    return raw
  }
}

export function dealStatus(stage: string): 'won' | 'lost' | 'open' {
  const s = stage.toLowerCase()
  if (s.includes('won')) return 'won'
  if (s.includes('lost')) return 'lost'
  return 'open'
}
