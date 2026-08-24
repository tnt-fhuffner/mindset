# MindSet

Aplicativo web de **mapas mentais** e **rede de compartilhamento de conteúdo**. Stack: Next.js 14 (App Router) + TypeScript + Tailwind + Supabase (Postgres, Auth, Storage, Realtime, RLS).

## 1. Pré-requisitos

- Node.js 18+
- Projeto no [Supabase](https://supabase.com)
- (Opcional) chave da [Anthropic](https://console.anthropic.com) para o assistente de IA
- (Opcional) OAuth do Google no painel do Supabase

## 2. Instalar

```bash
npm install
cp .env.example .env.local
```

Preencha `.env.local` com as chaves do Supabase. Nunca commite valores reais.

| Variável | Onde obter |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Project Settings → API → Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Project Settings → API → `anon` `public` |
| `SUPABASE_SERVICE_ROLE_KEY` | Project Settings → API → `service_role` (somente servidor) |
| `NEXT_PUBLIC_APP_URL` | `http://localhost:3000` em dev; URL da Vercel em prod |
| `ANTHROPIC_API_KEY` | Console Anthropic (opcional até ligar a IA) |
| `AI_MONTHLY_LIMIT` | Padrão `15` gerações grátis por usuário/mês |

## 3. Banco, Auth e Storage

No SQL Editor do Supabase, execute o arquivo:

`supabase/migrations/00001_init.sql`

Isso cria tabelas, RLS, trigger de perfil, admin master, buckets e publicação Realtime.

### Auth

Em **Authentication → Providers**:

1. E-mail: habilite senha e Magic Link.
2. Google: cole Client ID/Secret e adicione o redirect:
   - `https://SEU-PROJETO.supabase.co/auth/v1/callback`
3. Em **URL Configuration**, adicione:
   - Site URL: `http://localhost:3000`
   - Redirect URLs: `http://localhost:3000/auth/callback` e a URL de produção.

O e-mail **felipeqh.1991@gmail.com** vira `admin` automaticamente no cadastro (trigger `handle_new_user`). Se a conta já existir, rode:

```sql
select public.ensure_master_admin();
```

### Storage

Os buckets `uploads` e `avatars` entram na migration. Confirme em **Storage** que estão públicos para leitura.

### Realtime

A migration tenta incluir `messages`, `notifications`, `likes` e `comments` em `supabase_realtime`. Se algo falhar, ative as tabelas em **Database → Replication**.

## 4. Rodar localmente

```bash
npm run dev
```

Abra [http://localhost:3000](http://localhost:3000).

## 5. Rotas principais

| Rota | Função |
| --- | --- |
| `/login` `/signup` | Google, e-mail/senha e magic link |
| `/maps` | Pastas e mapas do usuário |
| `/maps/[id]` | Editor (React Flow) + exportação + IA |
| `/feed` | Timeline social |
| `/messages` | Chat privado (Realtime) |
| `/u/[username]` | Perfil público |
| `/s/[token]` | Mapa público ou somente com link |
| `/admin` | Usuários, denúncias e métricas (role `admin`) |

## 6. Segurança (o que já está no código)

- RLS em todas as tabelas de negócio
- Middleware bloqueia `/admin` se `role != admin`
- Upload validado no servidor (magic bytes + MIME + tamanho)
- Rate limit nas rotas `/api/ai/generate` e `/api/upload`
- Créditos de IA consumidos por RPC (`consume_ai_credit`)
- Campos `role` e `is_blocked` protegidos contra auto-promoção

## 7. Deploy

1. Suba o projeto na [Vercel](https://vercel.com) apontando para este repositório.
2. Configure as mesmas variáveis de `.env.example`.
3. Atualize Site URL e Redirect URLs no Supabase para o domínio da Vercel.

## 8. Scripts

```bash
npm run dev
npm run build
npm run start
npm run lint
```
# mindset
