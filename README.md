# MindSet

Aplicativo web de mapas mentais e rede de compartilhamento de conteúdo.

**Documentação completa do MVP** (modelagem, RLS, módulos, APIs, deploy e limitações): [docs/DOCUMENTACAO.md](docs/DOCUMENTACAO.md).

Stack: Next.js 14 + TypeScript + Tailwind + Supabase.

## Como rodar

1. Instale as dependências:
```bash
npm install
```

2. Configure as variáveis de ambiente:
```bash
cp .env.example .env.local
```
Preencha o `.env.local` com as chaves do seu projeto Supabase (URL, chave anônima e service role) e, se quiser o assistente de IA, a chave da Anthropic.

3. Crie um projeto no [Supabase](https://supabase.com) e execute as migrations em `supabase/migrations/` no SQL Editor, na ordem. Banco novo: `00001_init.sql` e em seguida `00006_map_collab.sql` (os arquivos `00002`–`00005` cobrem patches de bases antigas). Detalhes na [documentação](docs/DOCUMENTACAO.md#7-migrações).

4. Rode o projeto:
```bash
npm run dev
```

Acesse [http://localhost:3000](http://localhost:3000).

## Scripts

```bash
npm run dev      # desenvolvimento
npm run build    # build de produção
npm run start    # roda o build
npm run lint     # lint
```

Admin local (usa `.env.local`, não commitar senha):

```bash
node scripts/ensure-admin.mjs email@dominio senha
```

## Deploy na Vercel

1. Importe o repositório `tnt-fhuffner/mindset` (não crie um projeto Next.js em branco).
2. Em **Settings → Environment Variables**, copie as chaves do `.env.example` / `.env.local`:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `NEXT_PUBLIC_APP_URL` (a URL `https://….vercel.app`)
   - `NEXT_PUBLIC_MASTER_ADMIN_EMAIL`
   - `ANTHROPIC_API_KEY` (opcional)
3. Em **Deployments**, publique o commit mais recente da `main` (**Redeploy**). Variáveis `NEXT_PUBLIC_*` só entram no bundle no build.
4. No Supabase → Authentication → URL Configuration, adicione:
   - Site URL: a URL da Vercel
   - Redirect URLs: `https://SEU-PROJETO.vercel.app/auth/callback`
