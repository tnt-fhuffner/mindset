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

## Deploy

Suba o projeto na [Vercel](https://vercel.com) e configure as mesmas variáveis de ambiente do `.env.example`.
