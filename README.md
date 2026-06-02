# Davyn Dashboard (v2)

Dashboard estático do parceiro **Davyn Limited** — dados exportados do Introw em `davyn-v2/public/data.json`.

## Deploy no Vercel

1. Importe este repositório no [Vercel](https://vercel.com)
2. **Root Directory:** `davyn-v2` (obrigatório)
3. **Framework Preset:** Other (ou Vite/Static — o importante é não usar Next.js)
4. O `vercel.json` já define `outputDirectory: public` — não precisa mudar Build Command
5. Deploy (sem variáveis de ambiente)

Se aparecer **404**, confira no Vercel → Settings → General que **Root Directory** = `davyn-v2` e faça **Redeploy**.

## Atualizar dados

Substitua `davyn-v2/public/data.json` pelo arquivo gerado pelo Claude/Introw e faça push na branch `main`.

## Teste local

```bash
cd davyn-v2/public
python3 -m http.server 8080
```

Abra http://localhost:8080
