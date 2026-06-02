# Prompt para Claude (Introw → Davyn Dashboard)

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

## Fields to pull from Introw (REQUIRED best effort)
For EVERY deal include:
- id (HubSpot record ID — used for links)
- name, company, amount, currency, stage, pipeline, closeDate, owner, createdBy, status, notes
- createDate (deal created in HubSpot) — REQUIRED; use null only if truly unavailable after search
- lastActivityDate (last logged activity or note) — REQUIRED; use null only if unavailable
- employees (employee count / company size) — number or null
- hubspotUrl (full URL to deal in HubSpot if available), else null
- nextStepDue (date of committed next step from CRM if exists), else null
- **sender** (string): **Owner (Davyn)** — Davyn executive on the deal (e.g. `"Umar (Davyn)"`, `"Nicholas (Davyn)"`, `"Sekou (Davyn)"`). Derive from the most active @davyntt.com note author, or `dealOwnerDavyn.name`. Use `null` if unknown.

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
  "summary": "3-5 sentences: pipeline health, wins, risks, partner performance",
  "topActions": [
    {
      "priority": 1,
      "dealName": "...",
      "company": "...",
      "owner": "...",
      "action": "Specific action",
      "urgency": "critical|high|medium|low"
    }
  ]
}
Include exactly 5 items in topActions (highest impact open deals).

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
- Notes preserve dates in format [YYYY-MM-DD – email]: when present in source.

Generate the complete data.json now.
```

---

## Depois que o Claude responder

1. Salve como `data.json`.
2. Substitua: `Davyn Pipe Control/public/data.json`
3. Avise no Cursor: **"subi o data.json do Claude"** → push GitHub → Vercel atualiza.

## Campos que o dashboard usa

| Campo | Uso |
|--------|-----|
| deals[] | Tabelas, gráficos, filtros |
| isPartnerPipeline | Filtro "Partner pipeline only" |
| weeklyBrief | Aba **This week** + Next steps + CSV |
| suggestedNextStep | Next steps (prioridade sobre regras automáticas) |
| dealSummary | Modal ao clicar no deal |
| createDate | Coluna "Days in pipe" |
| lastActivityDate | Last touch / idle days |
| hubspotUrl | Link no modal |
| sender | Filtro **Owner (Davyn)** (executivo Davyn nas notas) |
| priorityScore, isStale | Score e aba Stalled (stale só para open no app) |

## Prompt curto (atualização rápida)

```
Refresh Davyn Limited deals from Introw. Output full data.json only (schema: updatedAt, weeklyBrief, deals with createDate, lastActivityDate, employees, hubspotUrl, sender, suggestedNextStep, dealSummary, actionUrgency, priorityScore, isStale false for won/lost). English. Valid JSON, no markdown.
```
