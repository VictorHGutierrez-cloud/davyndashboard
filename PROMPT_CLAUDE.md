# Prompt para Claude (Introw → Davyn Dashboard)

**Antes do push:** siga [`REVOPS_CHECKLIST.md`](REVOPS_CHECKLIST.md) (`node scripts/rotate-data.js` + `npm run validate`).

Copie **tudo** o bloco abaixo e cole no Claude. Ele deve devolver um arquivo **`data.json`** pronto para colar em `public/data.json`.

---

## Prompt (copiar daqui)

```
You are preparing a data export for the Davyn × Factorial partner dashboard (static site on Vercel).

## Your task
1. Pull ALL current deals/opportunities for partner **Davyn Limited** from Introw (HubSpot-linked data).
2. Build a single valid JSON file named `data.json` following the schema below exactly.
3. Enrich each OPEN deal with AI-written fields (English): dealSummary, suggestedNextStep, actionUrgency.
4. Add a root-level weeklyBrief for the Factorial partner manager (English).

## Output rules
- Return ONLY the JSON file content (no markdown fences, no commentary before/after).
- Valid JSON: double quotes, no trailing commas, null not "null" strings.
- Dates: ISO format YYYY-MM-DD only.
- status must be exactly one of: "open", "won", "lost" (map HubSpot/Introw stages accordingly).
- Keep original note text in `notes` — do not delete history.
- Amounts as numbers (not strings). Use null if unknown.

## FX for executive totals
- For every deal with `amount` and `currency`, set **amountUsd**:
  - USD: amountUsd = amount
  - EUR: amountUsd = round(amount × 1.08, 2)
  - Other currencies: best-effort USD equivalent or amountUsd = amount with a note in dealSummary if uncertain.

## Fields to pull from Introw (REQUIRED — data quality gate)
For EVERY deal include:
- id (HubSpot record ID — used for links)
- name, company, amount, currency, stage, pipeline, closeDate, owner, createdBy, status, notes
- **createDate** — REQUIRED; use null only if truly unavailable after search
- **lastActivityDate** — REQUIRED; use null only if unavailable
- employees (employee count / company size) — number or null
- **hubspotUrl** (full URL to deal in HubSpot if available), else null
- nextStepDue (date of committed next step from CRM if exists), else null
- **sender** (string): **Owner (Davyn)** — Davyn executive on the deal (e.g. `"Umar (Davyn)"`, `"Nicholas (Davyn)"`, `"Sekou (Davyn)"`). Derive from the most active @davyntt.com note author, or `dealOwnerDavyn.name`. Use `null` only after exhaustive search.

### Data quality gate (MANDATORY before you finish)
Compute fill rates across all deals:
- % with non-null sender
- % with non-null lastActivityDate
- % with non-null createDate

If **any** of these is below **90%**, add to `weeklyBrief.summary` an explicit warning sentence listing the gap and which deals are missing fields. Do not hide the problem.

## AI enrichment (you generate)
For deals with status "open":
- dealSummary: max 2 short sentences — situation, blocker, momentum.
- suggestedNextStep: 1 concrete action for Davyn/Factorial this week (start with a verb).
- actionUrgency: one of "critical" | "high" | "medium" | "low"

For won/lost:
- dealSummary: 1 sentence outcome.
- suggestedNextStep: null
- actionUrgency: null
- isStale: false (ALWAYS — never mark closed deals as stale)
- staleReason: null
- priorityScore: 0

## Root weeklyBrief (you generate)
"weeklyBrief": {
  "generatedAt": "YYYY-MM-DD",
  "summary": "3-5 sentences: pipeline health, wins, risks, partner performance. Include data-quality warning if fill rates < 90%.",
  "weekOverWeek": {
    "openPipelineUsdDelta": 0,
    "newStalled": 0,
    "wonCount": 0,
    "lostCount": 0
  },
  "topActions": [
    {
      "priority": 1,
      "dealName": "...",
      "company": "...",
      "owner": "...",
      "sender": "Umar (Davyn) or null",
      "hubspotUrl": "https://... or null",
      "action": "Specific action",
      "urgency": "critical|high|medium|low"
    }
  ]
}
- **weekOverWeek**: compare to the previous export if the user provides it; otherwise estimate from deal status/activity in the current pull (document assumptions in summary).
- Include exactly 5 items in topActions (highest impact open deals).
- Each topAction MUST include hubspotUrl and sender when available on the matching deal.

## Pipeline focus
- Include ALL pipelines in `deals[]` (do not drop onboarding/other pipelines).
- isPartnerPipeline: true when pipeline equals "Partners Distribution", else false.

## Stale / priority (OPEN deals only)
- isStale: true ONLY for status "open" when lastActivityDate is 90+ days ago OR no notes/activity
- staleReason: short English phrase or null
- priorityScore: integer 0-100 (amount, stage, recency, close likelihood)

## JSON schema

{
  "updatedAt": "YYYY-MM-DD",
  "partner": "Davyn Limited",
  "weeklyBrief": { ... },
  "deals": [
    {
      "id": "string",
      "name": "string",
      "company": "string",
      "amount": 0,
      "currency": "USD",
      "amountUsd": 0,
      "stage": "string",
      "pipeline": "string",
      "isPartnerPipeline": true,
      "closeDate": "YYYY-MM-DD or null",
      "owner": "string",
      "createdBy": "string",
      "status": "open",
      "notes": "string",
      "createDate": "YYYY-MM-DD or null",
      "lastActivityDate": "YYYY-MM-DD or null",
      "employees": null,
      "hubspotUrl": "https://... or null",
      "nextStepDue": "YYYY-MM-DD or null",
      "sender": "Umar (Davyn) or null",
      "dealSummary": "string or null",
      "suggestedNextStep": "string or null",
      "actionUrgency": "critical|high|medium|low or null",
      "isStale": false,
      "staleReason": null,
      "priorityScore": 0
    }
  ]
}

## Quality checks before you finish
- updatedAt = today's date.
- No duplicate ids.
- NO won/lost deal has isStale: true.
- Every open Partners Distribution deal with amount > 3000 has suggestedNextStep and dealSummary.
- weeklyBrief.topActions references real deal names from the export.
- Every deal has amountUsd when amount is non-null.
- Notes preserve dates in format [YYYY-MM-DD – email]: when present in source.
- sender / lastActivityDate / createDate fill rates ≥ 90% OR warning in weeklyBrief.summary.

Generate the complete data.json now.
```

---

## Depois que o Claude responder

1. Salve como `data.json`.
2. Instale com rotação do export anterior:
   ```bash
   node scripts/rotate-data.js ~/Downloads/data.json
   npm run smoke && npm run validate
   ```
3. Push GitHub → Vercel atualiza (ver [`REVOPS_CHECKLIST.md`](REVOPS_CHECKLIST.md)).

## Campos que o dashboard usa

| Campo | Uso |
|--------|-----|
| deals[] | Tabelas, gráficos, filtros |
| amountUsd | KPIs executivos, pipeline ponderado, gráficos (equiv. USD; EUR × 1.08 se ausente) |
| isPartnerPipeline | Filtro "Partner pipeline only" |
| weeklyBrief | Aba **This week** + Next steps + CSV |
| weeklyBrief.weekOverWeek | Delta semanal na aba This week |
| suggestedNextStep | Next steps (prioridade sobre regras automáticas) |
| dealSummary | Modal ao clicar no deal |
| createDate | Coluna "Days in pipe" |
| lastActivityDate | Last touch / idle days |
| hubspotUrl | Link no modal, This week, Next steps |
| sender | Filtro **Owner (Davyn)** + aba **Davyn team** scorecard |
| priorityScore, isStale | Score e aba Stalled (stale só para open no app) |

## Prompt curto (atualização rápida)

```
Refresh Davyn Limited deals from Introw. Output full data.json only (schema: updatedAt, weeklyBrief with weekOverWeek and topActions including hubspotUrl+sender, deals with amountUsd, createDate, lastActivityDate, hubspotUrl, sender, suggestedNextStep, dealSummary, actionUrgency, priorityScore, isStale false for won/lost). Fill rates ≥90% for sender/lastActivityDate/createDate or warn in summary. English. Valid JSON, no markdown.
```

## Escala futura (Fase 4 — fora do site estático)

- API HubSpot/Introw em vez de JSON manual
- Auth SSO / Vercel password protection
- Replicação do template para outros parceiros

O dashboard já expõe **weighted pipeline** (soma de `amountUsd × stage weight`) no Overview.
