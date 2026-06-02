# RevOps checklist — antes de cada push de dados

Use isto **sempre** que substituir `public/data.json` (export Claude / Introw).

## 1. Arquivar semana anterior

```bash
cd "/Users/victor.gutierrez/Desktop/Davyn Pipe Control"
node scripts/rotate-data.js ~/Downloads/data_N.json
```

Isto guarda o JSON atual em `public/data.previous.json` e instala o ficheiro novo. O dashboard calcula **week over week** a partir deste snapshot.

## 2. Validar qualidade (gate 90%)

```bash
npm run validate
```

Para **bloquear** push se sender / lastActivityDate / createDate &lt; 90%:

```bash
npm run validate:strict
```

## 3. Smoke test (evitar página em branco)

```bash
npm run smoke
```

## 4. Checklist manual

| Item | Meta | ✓ |
|------|------|---|
| `sender` (Owner Davyn) preenchido | ≥ 90% dos deals | |
| `lastActivityDate` | ≥ 90% | |
| `createDate` | ≥ 90% | |
| `amountUsd` em deals com amount | 100% | |
| `weeklyBrief.summary` avisa se &lt; 90% | sim | |
| 5× `topActions` com `hubspotUrl` | 5/5 | |
| 5× `topActions` com `sender` quando existir no deal | 5/5 | |
| Sem `isStale: true` em won/lost | 0 | |

## 5. Prompt Claude

- Usar bloco completo em [`PROMPT_CLAUDE.md`](PROMPT_CLAUDE.md).
- Anexar **`public/data.previous.json`** ao chat para `weekOverWeek` mais real (opcional; o app também calcula).

## 6. Deploy

```bash
git add public/data.json public/data.previous.json
git commit -m "Update partner data export"
git push
```

Espere 1–2 min → https://davyndashboard.vercel.app → **Cmd+Shift+R**.

## Campos críticos para coaching (Fase 2)

Sem `sender`, a aba **Davyn team** não permite decidir “quem precisa de coaching”. Priorize preenchimento via notas @davyntt.com ou `dealOwnerDavyn` no Introw.
