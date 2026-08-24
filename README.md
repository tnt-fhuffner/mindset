# MindSet

Aplicativo web de mapas mentais e rede de compartilhamento de conteúdo.

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
Preencha o `.env.local` com as chaves do seu projeto Supabase (URL e chave anônima) e, se quiser usar o assistente de IA, sua chave da Anthropic.

3. Crie um projeto no [Supabase](https://supabase.com) e execute o arquivo `supabase/migrations/00001_init.sql` no SQL Editor.

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

## Deploy na Vercel

1. Importe o repositório `tnt-fhuffner/mindset` (não crie um projeto Next.js em branco).
2. Em **Settings → Environment Variables**, copie as chaves do `.env.example` / `.env.local`:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `NEXT_PUBLIC_APP_URL` (a URL `https://….vercel.app`)
   - `NEXT_PUBLIC_MASTER_ADMIN_EMAIL`
   - `ANTHROPIC_API_KEY` (opcional)
3. Em **Deployments**, publique o commit mais recente da `main` (**Redeploy**).
4. No Supabase → Authentication → URL Configuration, adicione:
   - Site URL: a URL da Vercel
   - Redirect URLs: `https://SEU-PROJETO.vercel.app/auth/callback`
