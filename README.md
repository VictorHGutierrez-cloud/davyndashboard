# Davyn Dashboard

Dashboard de oportunidades do parceiro **Davyn Limited** integrado com Introw + Factorial.

---

## 🚀 Deploy no Vercel (passo a passo)

### 1. Suba o código para o GitHub

```bash
cd davyn-dashboard
git init
git add .
git commit -m "feat: initial dashboard"
gh repo create davyn-dashboard --private --push --source=.
# (ou crie o repo manualmente em github.com e faça git push)
```

### 2. Importe no Vercel

1. Acesse [vercel.com](https://vercel.com) → **Add New Project**
2. Selecione o repositório `davyn-dashboard`
3. Framework: **Next.js** (detectado automaticamente)
4. Clique em **Deploy** — vai falhar na 1ª vez porque faltam as env vars

### 3. Configure as variáveis de ambiente

No Vercel → seu projeto → **Settings → Environment Variables**, adicione:

| Variável | Valor |
|---|---|
| `INTROW_API_KEY` | Sua API key do Introw (Settings → API) |
| `DAVYN_PARTNER_ID` | `cmdx78p0600afp901u5r872a1` |
| `JWT_SECRET` | String aleatória segura (veja abaixo) |
| `DASHBOARD_USERS` | `email:hash_bcrypt` (veja abaixo) |

**Gerar JWT_SECRET:**
```bash
openssl rand -base64 32
```

**Gerar hash bcrypt para a senha:**
```bash
node -e "const b=require('bcryptjs'); console.log(b.hashSync('SuaSenhaAqui', 10))"
```

**Formato de DASHBOARD_USERS** (múltiplos usuários separados por vírgula):
```
voce@factorial.co:$2a$10$SEU_HASH_AQUI,outro@factorial.co:$2a$10$OUTRO_HASH
```

### 4. Re-deploy

Após salvar as env vars, clique em **Redeploy** no Vercel.

---

## 🔄 Atualização dos dados

Os dados são cacheados por **5 minutos** automaticamente (Next.js ISR).  
O botão **Atualizar** no dashboard força um refetch imediato.

---

## 🛠 Desenvolvimento local

```bash
npm install
cp .env.example .env.local
# Edite .env.local com seus valores reais
npm run dev
```

Acesse: http://localhost:3000

---

## 📦 Estrutura

```
app/
  api/
    auth/route.ts     — Login / logout (POST/DELETE)
    deals/route.ts    — Busca deals + comentários do Introw
  dashboard/page.tsx  — Dashboard completo (KPIs, gráficos, tabela)
  login/page.tsx      — Tela de login
lib/
  auth.ts             — JWT helpers
  introw.ts           — Cliente da API Introw
middleware.ts         — Proteção das rotas /dashboard e /api/deals
```
