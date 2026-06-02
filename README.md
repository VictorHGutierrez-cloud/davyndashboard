# Davyn Dashboard (v2)

Dashboard estático do parceiro **Davyn Limited** — dados do Introw em `public/data.json`.

## Deploy no Vercel

1. Importe [davyndashboard](https://github.com/VictorHGutierrez-cloud/davyndashboard) no Vercel
2. **Root Directory:** deixe **vazio** (raiz do repositório) — **não** use `davyn-v2`
3. Deploy — o `vercel.json` na raiz aponta para a pasta `public/`

URL: https://davyndashboard.vercel.app

## Atualizar dados (fluxo Claude → Cursor → Vercel)

1. Claude gera um novo `data.json` (use [`PROMPT_CLAUDE.md`](PROMPT_CLAUDE.md))
2. Siga o checklist: [`REVOPS_CHECKLIST.md`](REVOPS_CHECKLIST.md)
3. Comandos recomendados:

```bash
node scripts/rotate-data.js ~/Downloads/data_N.json   # arquiva o anterior + instala o novo
npm run smoke && npm run validate                     # testes antes do push
```

4. Push no GitHub → Vercel redeploy automático

Ver também: [`docs/SCALE.md`](docs/SCALE.md) (HubSpot API / SSO — futuro).

## Teste local

```bash
cd public
python3 -m http.server 8080
```

Abra http://localhost:8080
