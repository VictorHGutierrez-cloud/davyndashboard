# Future scale — Davyn Dashboard (architecture decisions)

**Status:** Document only. No HubSpot API or SSO in the static Vercel deployment until Davyn has **8+ weeks** of stable data quality (sender, createDate, lastActivityDate ≥ 90%).

## Current architecture (production)

```text
Introw export → Claude enrichment → public/data.json (+ data.previous.json)
                                      ↓
                              Vercel static (public/)
```

- Auth: client-side allowlist in `index.html` (pilot only).
- Week-over-week: computed in browser from `data.previous.json` when present.
- Weighted pipeline: `sum(amountUsd × stageWeight)` in browser.

## P3-1 — HubSpot read-only sync (future)

**Decision:** Replace manual JSON drop with a scheduled job (Vercel Cron + serverless, or GitHub Action) that:

1. Reads deals for partner pipeline from HubSpot API.
2. Writes `data.json` + rotates `data.previous.json`.
3. Runs `scripts/validate-data.js --strict` before commit.

**Why not now:** Half of deals still lack `sender` / `createDate`; automation would replicate bad CRM hygiene faster.

**Success metric:** Same dashboard UI, zero manual file copy, &lt; 15 min latency from HubSpot to Vercel.

## P3-2 — SSO / Vercel Password (future)

**Decision:** Enable Vercel Deployment Protection (password) or Factorial SSO proxy **before** exposing dashboard to Davyn external users.

**Why not now:** Internal pilot (Factorial emails only); client-side password is not audit-grade.

## P3-3 — Multi-partner template (future)

**Decision:** Parameterize `partner` in JSON + white-label header; one repo, many `data/{partnerId}.json` or subpaths.

**Prerequisite:** Davyn playbook proven (weekly call + DQ gate) for 8 weeks.

## Revenue attribution (out of scope today)

Future fields: `revenueAttributedPartner`, `revenueAttributedDirect`, `arr`, `expansion`. Requires Finance + CRM alignment.

## Review cadence

Re-evaluate P3 when:

- [ ] 8 consecutive weekly exports pass `validate:strict`
- [ ] PDM uses Davyn team tab in every partner QBR
- [ ] Second partner requests same dashboard
