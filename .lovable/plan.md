# Plano: Reconstruir o Lajes Fit do zero

Vou refazer o app totalmente, apagar o banco atual e te guiar pra conectar um repositório novo no GitHub.

## O que você precisa fazer (antes de eu começar a implementar)

**1. Desconectar o repo atual e criar um novo no GitHub** — eu não consigo criar repositórios no GitHub por você. Passos:

- No Lovable: menu **+ (canto inferior esquerdo do chat) → GitHub → Disconnect** (desconecta o repo atual que está com código quebrado).
- No GitHub: clique em **New repository**, nome **`Lajes Fit`**, deixe vazio (sem README), e clique em Create.
- De volta ao Lovable: **+ → GitHub → Connect → selecionar o novo repo `Lajes Fit`**.

A partir desse momento, toda alteração que eu fizer aqui vai pro novo repo automaticamente.

> Se você prefere fazer isso DEPOIS de eu refazer o código, também funciona — o Lovable só sincroniza com GitHub quando estiver conectado.

## O que eu vou fazer

### 1. Limpar o banco de dados
- Drop de todas as tabelas atuais: `profiles`, `posts`, `post_likes`, `post_comments`, `follows`, `workouts`, `diet_entries`, `events`, `event_participants`, `strava_tokens`, `taco_foods`.
- Drop da função `handle_new_user` e do trigger correspondente.
- Drop do bucket de storage `media`.

### 2. Recriar o schema mínimo, limpo, com RLS correto

Tabelas:
- **`profiles`** — username, display_name, avatar_url, bio. Trigger auto-cria no signup a partir do e-mail. Leitura pública (autenticados), escrita só do dono.
- **`posts`** — autor, texto, mídia opcional. Leitura: autenticados; escrita: dono.
- **`post_likes`** — autor + post (unique). Curtir/descurtir só autenticado, só pelo dono da curtida.
- **`post_comments`** — autor, post, texto. Editar/deletar só pelo dono.
- **`follows`** — follower + following (unique).
- **`workouts`** — dono, tipo (corrida/bike/trilha/musculação/outro), duração, distância, calorias, notas, data. Listagem pública entre autenticados; escrita só do dono.
- **`diet_entries`** — dono, alimento (TACO), quantidade (g), refeição, data. Só o dono lê e escreve.
- **`taco_foods`** — tabela TACO read-only com nome, calorias, proteína, carbo, gordura por 100g. Leitura pública; sem escrita pelo cliente.

Toda tabela com `GRANT` correto pra `authenticated` + `service_role`, RLS habilitado, policies usando `auth.uid()`. Tabela de roles (`user_roles` + `has_role`) só se você pedir admin depois — por ora não precisa.

Storage: bucket `media` privado, com policies pra autenticados subirem na própria pasta `{user_id}/...` e lerem qualquer mídia.

### 3. Refazer o frontend (TanStack Start, padrão Lovable)

Stack que será usada (a mesma que o Lovable usa em projetos novos):
- TanStack Start + TanStack Router + TanStack Query
- Supabase JS para auth e dados
- Tailwind v4 + shadcn/ui
- Bebas Neue + Inter (já configurado)

Rotas:
- `/` — landing pública (igual hoje, mantém o visual)
- `/auth` — **só e-mail + senha**, abas Entrar / Criar conta (sem Google, sem mágico, sem provider OAuth)
- `/_authenticated/feed` — feed cronológico com curtir/comentar
- `/_authenticated/workouts` — listagem + dialog pra registrar treino manual
- `/_authenticated/diet` — entradas do dia + busca na TACO + totais de calorias/macros
- `/_authenticated/profile/$username` — perfil com posts e treinos do usuário
- `/_authenticated/settings` — editar display_name, avatar, bio

Auth: **e-mail + senha apenas**. Sessão fica salva no backend (Supabase) e persistida no navegador via `localStorage` — login se mantém entre visitas. Vou **desativar a confirmação obrigatória de e-mail** pra cadastro funcionar imediatamente, e **desativar signups anônimos**.

### 4. Componentes a remover (não vão ser reescritos)
- Tudo relacionado a **Strava** (tabela `strava_tokens`, integração OAuth) — não estava funcionando e adiciona complexidade.
- Eventos (você não marcou na lista) — fora do escopo desta reconstrução.

### 5. Sem ferramentas estranhas
- Não vou usar Supabase Edge Functions pra lógica interna — só `createServerFn` do TanStack quando precisar.
- Sem código vindo do Codex/Claude. Tudo padrão Lovable.

## Detalhes técnicos

- **Migrations** rodam via tool de migration do Lovable; cada migration tem `GRANT` correto.
- **Cliente Supabase**: o auto-gerado em `src/integrations/supabase/client.ts`, importado como `@/integrations/supabase/client`.
- **Layout protegido**: `src/routes/_authenticated/route.tsx` (já gerenciado, ssr: false, redireciona pra `/auth`).
- **Trigger `handle_new_user`** recriado pra popular `profiles` a partir do metadata do signup (username + display_name).
- **Tabela TACO**: vou semear ~50 alimentos brasileiros comuns (arroz, feijão, frango, ovo, banana, etc.) na própria migration. Se quiser a tabela completa (~600 itens) depois, dá pra adicionar.

## Ordem de execução

1. Você cria o novo repo no GitHub e conecta (ou me avisa pra fazer depois).
2. Confirmo o plano → entro em build mode.
3. Migration 1: dropa tudo. Você aprova.
4. Migration 2: recria schema + RLS + TACO seed. Você aprova.
5. Reescrevo todo o frontend.
6. Configuro auth (e-mail/senha, sem confirmação, sem anônimo).
7. Testo o build, te aviso pra fazer signup e validar.

Posso seguir?