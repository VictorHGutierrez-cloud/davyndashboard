# Davyn Dashboard (v2)

Dashboard estático do parceiro **Davyn Limited** — dados exportados do Introw em `davyn-v2/public/data.json`.

## Deploy no Vercel

1. Importe este repositório no [Vercel](https://vercel.com)
2. **Root Directory:** `davyn-v2`
3. Deploy (sem variáveis de ambiente necessárias)

## Atualizar dados

Substitua `davyn-v2/public/data.json` pelo arquivo gerado pelo Claude/Introw e faça push na branch `main`.

## Teste local

```bash
cd davyn-v2/public
python3 -m http.server 8080
```

Abra http://localhost:8080
