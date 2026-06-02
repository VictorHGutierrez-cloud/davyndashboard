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

## Fields to pull from Introw (best effort)
For EVERY deal try to include:
- id (record ID)
- name, company, amount, currency, stage, pipeline, closeDate, owner, createdBy, status, notes
- createDate (deal creation date) — REQUIRED attempt; use null only if truly unavailable
- lastActivityDate (last logged activity or note date) — REQUIRED attempt
- employees (revised employee count or company size) — number or null

## AI enrichment (you generate)
For deals with status "open":
- dealSummary: max 2 short sentences — situation, blocker, momentum.
- suggestedNextStep: 1 concrete action for Davyn/Factorial this week (start with a verb).
- actionUrgency: one of "critical" | "high" | "medium" | "low"

For won/lost:
- dealSummary: 1 sentence outcome.
- suggestedNextStep: null
- actionUrgency: null

## Root weeklyBrief (you generate)
```json
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
```
Include exactly 5 items in topActions (highest impact open deals).

## Pipeline focus
- Include ALL pipelines in `deals[]` (do not drop onboarding/other pipelines).
- Add boolean `isPartnerPipeline`: true when pipeline equals "Partners Distribution", else false.

## Stale / priority hints (you generate for open deals)
- isStale: true if lastActivityDate is 90+ days ago OR no notes/activity (explain in staleReason).
- staleReason: short English phrase or null
- priorityScore: integer 0-100 (your judgment: amount, stage, recency, close likelihood)

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
- Every open deal in Partners Distribution with amount > 3000 has suggestedNextStep and dealSummary.
- weeklyBrief.topActions references real deal names from the export.
- Notes preserve dates in format [YYYY-MM-DD – email]: when present in source.

Generate the complete data.json now.
```

---

## Depois que o Claude responder

1. Salve como `data.json`.
2. Substitua: `Davyn Pipe Control/public/data.json`
3. Avise no Cursor: **“subi o data.json do Claude”** → push GitHub → Vercel atualiza.

## Campos que o dashboard usa hoje

| Campo | Uso |
|--------|-----|
| deals[] | Tabelas, gráficos, filtros |
| status, stage, pipeline, amount | KPIs e charts |
| notes | Last touch (datas nas notas) |
| createDate | Days open (quando existir) |
| suggestedNextStep | Aba Next steps (se presente, prioriza sobre regras) |
| priorityScore, isStale | Prioridade e stalled |
| weeklyBrief | Pode ser exibido na aba Next steps (implementar quando vier no JSON) |

## Prompt curto (atualização rápida)

Se já tem um export anterior e só mudou o Introw:

```
Refresh Davyn Limited deals from Introw. Output full data.json only (same schema as before: updatedAt, weeklyBrief, deals with createDate, lastActivityDate, suggestedNextStep, dealSummary, actionUrgency, priorityScore, isStale). English. Valid JSON, no markdown.
```
