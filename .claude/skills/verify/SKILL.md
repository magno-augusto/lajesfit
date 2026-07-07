---
name: verify
description: Como buildar, rodar e dirigir o LajesFit para verificar mudanças de runtime (fluxos autenticados via usuário de teste descartável).
---

# Verificar o LajesFit de ponta a ponta

## Build / lançamento

- `npm run dev` — Vite dev server; tenta o porto **8080** e cai para 8081+ se ocupado (leia o output para saber o porto real).
- `npx tsc --noEmit` e `npx eslint <arquivos>` para checagens estáticas; `npm run build` (Vite + Nitro/Vercel, ~45s).
- Playwright **não** está no node_modules do projeto — instale em um diretório temporário (`npm i playwright` + `npx playwright install chromium`) e rode scripts de lá.

## Autenticação para fluxos protegidos

Quase tudo fica sob `/_authenticated` (AppShell exige sessão + perfil IDR). Receita com as chaves do `.env` da raiz:

1. Criar usuário descartável: `POST {SUPABASE_URL}/auth/v1/admin/users` com a `SUPABASE_SERVICE_ROLE_KEY` (headers `apikey` + `Authorization: Bearer`), body `{ email, password, email_confirm: true, user_metadata: { username, display_name } }`.
2. Semear o perfil IDR para pular o `/setup`: `PATCH {SUPABASE_URL}/rest/v1/profiles?id=eq.<uid>` com `calorie_goal` (e `goal_*`) preenchidos — um trigger já criou a linha em `profiles` no signup.
3. Login na UI em `/auth`: os campos aceitam **e-mail** direto (ou username); botão "Entrar" dentro do `<form>`.
4. **Sempre deletar ao final**: `DELETE {SUPABASE_URL}/auth/v1/admin/users/<uid>` (cascateia para `profiles`).

⚠️ É o Supabase de **produção**: não publicar posts no feed nem entrar em desafios com o usuário de teste; preferir Cancelar/Esc em vez de salvar.

## Pegadinhas ao dirigir

- **Hidratação**: as páginas são SSR (TanStack Start). Interagir logo após `domcontentloaded` faz o form de login submeter em GET nativo (`/auth?`). Espere `networkidle` + ~2s antes de preencher.
- **Aberturas de modal**: refeição = botão `aria-label "Adicionar item em <refeição>"` na `/dieta` (não existe botão "Adicionar refeicao" quando `showTrigger={false}`); treino = botão "Registrar" na `/treinos`; post = FAB `aria-label "Criar novo registro"` → item "Post no feed".
- **Simular volta de foco / token refresh** sem celular: `window.dispatchEvent(new Event("lajesfit-backend-change"))` dispara o `sync()` do `useFitness` (mesmo caminho do `onAuthStateChange`).
- Busca de alimento tem debounce de 400ms + chamada ao Open Food Facts que falha por CORS em localhost (cai para o banco) — espere ~2,5s após digitar.

## Fluxos que valem verificação

- Rascunhos de formulário (sessionStorage): `lajesfit-meal-draft` (AddFoodDialog), `lajesfit-workout-draft` (ManualWorkoutDialog), `lajesfit-post-draft` (CreatePostDialog). Preencher → `page.reload()` → modal reabre restaurado; Cancelar/fechar → reload → não reabre.
- Sync silencioso: disparar o evento acima com um modal aberto não pode desmontar a tela (AppShell só mostra blank na carga inicial).

Script de referência da última verificação: `verify-app.mjs` (scratchpad da sessão) — cria usuário, dirige dieta/treino/post, deleta usuário.
