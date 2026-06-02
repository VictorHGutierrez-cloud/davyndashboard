# Davyn Dashboard (v2)

Dashboard estático do parceiro **Davyn Limited** — dados do Introw em `public/data.json`.

## Deploy no Vercel

1. Importe [davyndashboard](https://github.com/VictorHGutierrez-cloud/davyndashboard) no Vercel
2. **Root Directory:** deixe **vazio** (raiz do repositório) — **não** use `davyn-v2`
3. Deploy — o `vercel.json` na raiz aponta para a pasta `public/`

URL: https://davyndashboard.vercel.app

## Atualizar dados (fluxo Claude → Cursor → Vercel)

1. Claude gera um novo `data.json`
2. Substitua o arquivo `public/data.json` nesta pasta
3. Peça push no GitHub → Vercel redeploy automático

## Teste local

```bash
cd public
python3 -m http.server 8080
```

Abra http://localhost:8080
