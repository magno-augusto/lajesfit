# Ambientes: separar teste de produção (Supabase)

**Status:** **Android e dev local web concluídos** — login via staging no celular
físico/tablet cria conta nova, isolada de produção (produção intacta); `.env.local`
da web também aponta pro staging desde 2026-07-28. Falta só o **Vercel Preview**
(env vars, pendente). É o item 1 (o mais urgente) de `praticas-engenharia.md`.
Abordagem escolhida: **segundo projeto Supabase na nuvem** (staging) — não Docker
local, não branching pago. Motivo: preserva o fluxo real de teste do Magno (celular
físico/tablet, OAuth Google, Health Connect), que o Supabase local dificultaria.

**Fluxo de trabalho pretendido (confirmado com o Magno em 2026-07-28):**
implementação nova → testada em staging (debug Android + dev local/Preview web) →
Magno revisa e aprova → merge pra `main` → produção (release assinado na Play +
Vercel Production). Testar funcionalidades **como usuário real** (conta Google
pessoal, refeições/treinos de verdade) é diferente disso e pode ir direto pra
produção sem problema — não é "sujeira de teste", é uso genuíno que outros
usuários da plataforma podem ver.

## Problema

Existe um único projeto Supabase (`lajesfit`, ref `lmqzjmxtlecbwqpoumux`). Dev
local (web e app debug) e o app publicado escrevem no **mesmo** banco — testar
arrisca dados reais de usuário.

## Modelo de ambientes

| Ambiente | Quem usa | Projeto Supabase | Como aponta |
|---|---|---|---|
| **Produção** | app release na Play + Vercel Production (`lajesfit.vercel.app`) | `lajesfit` (atual) | Vercel Production env + `local.properties` (`SUPABASE_URL`/`SUPABASE_ANON_KEY`) no build release |
| **Staging** | dev local (web `.env.local`) + app **debug** + Vercel Preview | projeto novo | `.env.local`, Vercel Preview env, `local.properties` (`SUPABASE_URL_STAGING`/`SUPABASE_ANON_KEY_STAGING`) |

Regra: **nada de desenvolvimento toca produção.** Os únicos que falam com produção
são o build release assinado e o deploy de Production da Vercel.

## Projeto staging

- **Ref:** `fdkzivghgeanujwavsbn` (URL `https://fdkzivghgeanujwavsbn.supabase.co`)
- **Região:** `us-west-2` (produção é `us-east-2` — só adiciona latência ao testar,
  sem impacto em produção; mantido de propósito).
- **Migrations:** as 54 aplicadas, 0 pendentes (schema idêntico ao repo).

## O que já foi feito no repo (Claude)

- `android/app/build.gradle.kts`: as chaves do Supabase agora são **por build
  type** — `debug` lê `SUPABASE_URL_STAGING`/`SUPABASE_ANON_KEY_STAGING`; `release`
  mantém `SUPABASE_URL`/`SUPABASE_ANON_KEY`. Sem as chaves `_STAGING`, o debug cai
  para produção com um aviso no build (nunca em silêncio).
- Web (`src/integrations/supabase/client.ts`) já lê URL/anon key de env var —
  basta apontar `.env.local` (dev) e Vercel Preview para o staging. Sem mudança de
  código.
- **Reprodutibilidade das migrations:** `20260625130000_seed_food_measures.sql`
  dependia de `foods.id` (BIGSERIAL) hardcoded, que só existiam em produção por
  causa dos imports via script (`scripts/import-*.js`, que não são migrations).
  Reescrita para casar por chave natural `(source, source_id)`, então o `db push`
  agora reconstrói o banco do zero. **Editar essa migration é seguro em produção:
  ela já está registrada como aplicada lá e não re-executa; o resultado seria
  idêntico de qualquer forma.** É a base para os itens CI/CD e backups do backlog.

## Passo a passo — Magno (dashboard, só você tem acesso)

1. **Criar o projeto staging** no Supabase (mesma org): nome `lajesfit-staging`,
   mesma região de produção; guarde a senha do banco.
2. Copie do projeto novo: **Project URL**, **anon key** e o **ref**
   (`<ref>.supabase.co`). Me passe o **ref** para eu aplicar as migrations.
3. **Google OAuth** (para o login funcionar no staging):
   - No projeto staging: `Authentication > Providers > Google` → cole o mesmo
     client id/secret usado em produção.
   - No Google Cloud (o OAuth client já existente): em `Authorized redirect URIs`
     adicione `https://<ref-staging>.supabase.co/auth/v1/callback`.
   - No projeto staging: `Authentication > URL Configuration > Redirect URLs` →
     adicione `lajesfit://**` e as URLs de localhost/Preview (ver `config.toml`).
4. **Preencher as chaves:**
   - `android/local.properties`: `SUPABASE_URL_STAGING`, `SUPABASE_ANON_KEY_STAGING`.
   - `.env.local` (web): trocar `VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY` para o
     staging.
   - Vercel `> Settings > Environment Variables`: as mesmas chaves no escopo
     **Preview** (mantendo **Production** com as de produção).

## Passo a passo — Claude (concluído)

1. ✅ `supabase link --project-ref fdkzivghgeanujwavsbn`
2. ✅ `supabase db push` — 54 migrations aplicadas (0 pendentes).
3. **O link do CLI está em staging** e deve ficar assim como padrão de trabalho. Só
   linkar produção (`supabase link --project-ref lmqzjmxtlecbwqpoumux`) deliberadamente
   ao promover uma migration — assim um `db push` acidental cai no staging, não em
   produção.

## Estado atual

- ✅ **Android:** `local.properties` com as chaves `_STAGING` (publishable key
  `sb_publishable_…`); provider Google habilitado no staging + callback autorizado
  no OAuth client web do Google Cloud; app debug instalado no celular e **login
  testado** — cria conta nova, isolada de produção. O app debug convive com o
  release (`com.lajesfit.app.debug`). **`local.properties` é local/gitignored —
  cada máquina nova (ex.: a de 2026-07-28) precisa repetir esse preenchimento do
  zero**, não é algo que o git carrega.
- ✅ **Web (dev local):** `.env.local` com as chaves `SUPABASE_*`/`VITE_SUPABASE_*`
  do staging (2026-07-28) — sobrescreve o `.env` de produção puxado via
  `vercel env pull` (`.env.local` vence no Vite). `npm run dev` local já cai no
  staging.
- ⏳ **Web (Vercel Preview):** falta criar as env vars de escopo **Preview** no
  dashboard da Vercel apontando pro staging (hoje Preview provavelmente herda as
  de Production, já que nunca foi configurado à parte). Precisa de acesso ao
  dashboard da Vercel (não instalamos a CLI ainda) — pendente.
- ⏳ **Dados de teste (opcional):** `scripts/create-test-user.js` para um usuário
  fixo de e-mail/senha (precisa da service_role do staging, rodado pelo Magno), ou
  os `scripts/import-*.js` para o catálogo completo de alimentos. O catálogo atual
  tem só TACO + estimated das migrations.

## Pendências / cuidados

- Free tier **pausa** o projeto após ~1 semana sem uso — despausar no dashboard
  antes de testar.
- Popular o staging com um usuário de teste: `scripts/create-test-user.js`
  apontando para o staging.
- O item "backups" (`praticas-engenharia.md > Depois`) passa a valer só para
  produção.
