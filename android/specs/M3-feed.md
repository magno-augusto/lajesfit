# M3 — Navegação + Feed

Status: **implementado nesta sessão, compila limpo (`./gradlew :app:compileDebugKotlin`), pendente
de teste real em dispositivo/emulador.** Ver checklist "Feito quando" abaixo.

## Objetivo

Portar o feed principal do web (`FeedPage.tsx` + `feed-api.ts` + `posts-api.ts` + `likes-api.ts` +
`comments-api.ts`) para Android: feed paginado via RPC `get_feed_post_ids`, curtir/descurtir,
apagar post próprio, criar post (só texto nesta fase) e comentar (tela separada, não modal — já
decidido em `specs/PLANO.md:35`). O grafo de navegação (bottom nav de 4 abas + FAB central) já
existe desde o M0; este marco troca os placeholders de Feed/CreatePost por conteúdo real e
acrescenta a rota nova de comentários.

## Comportamento do web a espelhar (fonte da verdade)

Lido em `src/features/feed/feed-api.ts`, `posts-api.ts`, `likes-api.ts`, `comments-api.ts`,
`FeedPage.tsx`, `PostCard.tsx`, `CommentsDialog.tsx`, `CreatePostDialog.tsx`, `format.ts` e
`supabase/migrations/*.sql`:

- **Paginação** (`fetchFeed`, `feed-api.ts:124-153`): `supabase.rpc("get_feed_post_ids", { p_user_id,
  p_limit, p_offset })` — **offset**, não keyset/cursor. `FEED_PAGE_SIZE = 20` (`feed-api.ts:122`).
  A RPC (versão atual, `supabase/migrations/20260711120000_hide_private_profiles_feed_leaderboards.sql:4-22`)
  retorna só `post_id`, ordenado por: não-visto-ainda ASC, tem mídia ASC, autor seguido ASC,
  `created_at DESC`, filtrando por visibilidade (perfil público, é o próprio autor, segue o autor,
  ou o usuário atual é admin). Depois: `posts.select(...).in("id", ids)`, e como `.in()` não
  preserva ordem, **reordena localmente** pra bater com a ordem que a RPC devolveu
  (`feed-api.ts:147-150`). UI web usa botão **"Carregar mais"** (não scroll infinito), habilitado
  quando a última página veio completa (`length === FEED_PAGE_SIZE`, `FeedPage.tsx:56,133,156`).
- **Hidratação** (`buildFeedPosts`, `feed-api.ts:48-120`): a partir dos posts brutos, 5 buscas em
  paralelo — `profiles` dos autores; `post_likes.select("post_id").in(...)` (conta em JS, **não há
  coluna agregada nem trigger de contagem**); `post_comments.select("post_id").in(...)` (idem);
  `post_likes...eq("user_id", currentUserId)` pra saber quais o usuário atual já curtiu; e
  `workouts` só pros posts com `workout_id` não-nulo. Portar essa mesma abordagem (múltiplas
  queries, contagem client-side) — não é o jeito mais eficiente, mas é o comportamento real hoje;
  otimizar fica pro web primeiro, não é escopo deste port.
- **`inferPostType`** (`feed-api.ts:39-46`): heurística **client-side**, não há coluna `type` na
  tabela `posts` (existia num schema antigo, foi dropada). Se `content` começa com "Cafe da manha
  registrado"/"Almoco registrado"/"Lanche registrado"/"Jantar registrado" → `diet`; senão, se o post
  tem `workout_id` → `workout`; senão → `general`.
- **Curtir/descurtir** (`likes-api.ts`): `likePost` insere em `post_likes`; erro `23505` (like
  duplicado, `post_likes` tem PK composta `(post_id, user_id)`) é **engolido silenciosamente**, não
  é erro de verdade. `unlikePost` deleta por `(user_id, post_id)`. UI web é **otimista** — alterna o
  estado local na hora, reverte se a chamada falhar (`PostCard.tsx:67-80`).
- **Apagar post** (`deletePost`, `feed-api.ts:196-199`): `delete().eq("id", postId).eq("user_id",
  userId)` — RLS já garante só-dono (`posts_delete_own`), o client também guarda por clareza. Opção
  só aparece se `currentUserId == post.user_id`; web pede confirmação num `AlertDialog` antes.
- **Comentários** (`comments-api.ts`): `fetchComments` busca `post_comments` + join manual de
  `profiles`, ordenado por `created_at ASC`. `addComment` valida texto não-vazio ("Escreva um
  comentario antes de enviar" se vazio) e insere. `deleteComment` só dono, **sem confirmação** (ao
  contrário de apagar post). No web isso é um modal (`CommentsDialog.tsx`); **no Android é uma tela
  separada** `post/{postId}/comments` (`CommentsScreen`) — decisão já registrada em
  `specs/PLANO.md:35`, não redecidir.
- **Criar post** (`CreatePostDialog.tsx` + `posts-api.ts`): nesta fase **só texto** (`media_url =
  null`) — `specs/PLANO.md:127` explicitamente aceita "texto simples" pro Android nesta fase. Upload
  de imagem/vídeo do web (`uploadPostMedia`, bucket `media`, compressão, limite de 15s pra vídeo)
  fica de fora (ver "Fora do escopo").
- **"Visto"** (`FeedPage.tsx:93-118`): web usa `IntersectionObserver` (threshold 0.5) por post card,
  debounce de 800ms, e chama `markPostsViewed` (upsert em `post_views`) — é esse sinal que faz a RPC
  não repetir posts já vistos no topo. Não há equivalente direto simples de "visibilidade de scroll"
  em Compose sem trabalho extra; ver simplificação proposta em "Arquitetura".
- **Formatação de tempo** (`format.ts:15-23`, `timeAgo`): "agora" (<60s), "`Nmin`" (<1h), "`Nh`"
  (<1d), "`Nd`" (<7d), senão data no formato `pt-BR`.
- **Card do post** (`PostCard.tsx`): avatar + nome/@usuário + `timeAgo`; badge "Treino"/"Dieta"
  conforme `inferPostType`; imagem (`media_url`) via `<img>` se não for vídeo (heurística: extensão
  `.mp4`/`.webm`/`.mov` ou `"video"` na URL), vídeo via `<video controls>` senão; bloco de
  estatísticas se `post.workout != null` (tipo de atividade, distância, duração, calorias, link
  Strava se houver); footer com curtir (contagem + coração preenchido se `liked_by_me`), comentar
  (contagem, abre `CommentsDialog`/no Android abre `CommentsScreen`), compartilhar (só em posts
  próprios — fora de escopo, ver abaixo).

## Schema (fonte da verdade — `supabase/migrations/*.sql`, não recriar nem redesenhar)

- `posts`: `id uuid pk`, `user_id uuid`, `content text not null`, `media_url text` (nullable, **uma
  URL só, não array** — a coluna `media_urls[]`/`type` de um schema antigo foi dropada), `workout_id
  uuid` (nullable, `20260625150000_link_posts_to_workouts.sql`), `created_at`, `updated_at`. RLS:
  select visível se perfil público do autor OU é o próprio dono OU segue o autor OU é admin
  (`20260618202000_public_profiles_privacy_toggle.sql:50-67`); insert/update/delete só dono.
- `post_likes`: `post_id`, `user_id`, `created_at`, **PK composta `(post_id, user_id)`** (é isso que
  gera o `23505` em like duplicado). RLS: select livre pra autenticados, insert/delete só dono (sem
  policy de update — likes não se editam).
- `post_comments`: `id uuid pk`, `post_id`, `user_id`, `content text`, `created_at`. RLS: select
  livre, insert/delete só dono.
- `post_views`: `post_id`, `user_id`, `viewed_at`, PK composta `(post_id, user_id)`. RLS: só o
  próprio usuário lê/insere as próprias views.
- **RPC `get_feed_post_ids(p_user_id uuid, p_limit int, p_offset int) RETURNS TABLE(post_id uuid)`**
  — já existe no banco, `SECURITY DEFINER`, `GRANT EXECUTE TO authenticated`. Não recriar, só chamar.
- Bucket de storage `media`: fora de escopo nesta fase (sem upload), mas útil saber que
  `media_url` já vem como **URL assinada completa** (5 anos de validade) — pra exibir a imagem de um
  post existente não precisa de nenhuma chamada extra ao Storage, só carregar a URL direto.
- Efeito colateral automático: like/comentário disparam trigger no banco que insere em
  `notifications` (`20260703120000_notifications.sql`) — nada a fazer no client, é automático.

## Arquitetura no Android

- **Adicionar Coil** como dependência (`libs.versions.toml` + `app/build.gradle.kts`) — já decidido
  em `CLAUDE.md` ("Coil (imagens)"), ainda não usado até agora.
- **`feature/feed/`** (pasta hoje só com os 2 placeholders do M0):
  - Modelos `@Serializable` novos: linha crua de `posts`, `profiles` (projeção mínima: id, username,
    display_name, avatar_url — reusável por telas futuras, não recriar depois), `post_likes`,
    `post_comments`, `post_views`, e uma projeção mínima de `workouts` (id, activity_type,
    distance_meters, duration_seconds, calories, title, strava_activity_id — só os campos do card;
    a feature Workouts completa do M5 pode construir os próprios modelos maiores depois, sem
    depender destes). Seguir o padrão de `@SerialName` + `Columns.list(...)` explícito estabelecido
    em `GoalsRepository` (M2) — não usar `Columns.type<T>()` por reflexão.
  - **`FeedRepository.kt`**: `fetchFeed(offset, limit): List<FeedPost>` (chama a RPC via
    `postgrest.rpc(...)`, hidrata em paralelo com `kotlinx.coroutines.async`/`awaitAll` pras 5
    buscas, reordena local pra bater com a RPC), `markPostsViewed(postIds)`, `likePost(postId)`/
    `unlikePost(postId)` (engolindo `23505` igual ao web), `deletePost(postId)`, `createPost(content:
    String)` (`media_url = null` nesta fase). Consolida num repositório só o que no web é
    `feed-api.ts` + `likes-api.ts` + `posts-api.ts` — não precisa da mesma granularidade de arquivos
    do web, já que cada ViewModel do Android já delimita por tela.
  - **`CommentsRepository.kt`**: `fetchComments(postId)`, `addComment(postId, content)`,
    `deleteComment(commentId)` — arquivo separado porque `CommentsScreen` é uma tela própria com seu
    próprio ciclo de vida (`hiltViewModel()` escopado à entrada de navegação).
  - **`FeedScreen.kt` + `FeedViewModel.kt`**: lista (`LazyColumn`), estado acumulado de páginas
    (`posts: List<FeedPost>`, `hasMore`, `loadingMore`), botão "Carregar mais" espelhando o web (sem
    scroll infinito nem Paging3 — não introduzir essa dependência agora). Like otimista com
    rollback. Apagar com `AlertDialog` de confirmação, só visível em posts do próprio usuário.
  - **`PostCard`** (composable dentro de `FeedScreen.kt` ou arquivo próprio): avatar via Coil
    `AsyncImage`, `timeAgo` (portar `format.ts:15-23`), badge treino/dieta via `inferPostType`
    portado 1:1, imagem via Coil se `media_url` não for vídeo pela heurística de extensão/URL; se for
    vídeo, mostrar um placeholder simples ("Vídeo — abrir no navegador" ou similar, sem player
    inline — ver "Fora do escopo"), bloco de stats se `workout != null`.
  - **`CreatePostScreen.kt` + `CreatePostViewModel.kt`**: substitui o placeholder — campo de texto,
    botão "Publicar", chama `createPost`, `onDone` volta pro Feed (via `popBackStack`, já é assim
    hoje na navegação do M0).
  - **`CommentsScreen.kt` + `CommentsViewModel.kt`** (novo): recebe `postId` via argumento de
    navegação, lista comentários + campo de novo comentário, apagar só nos próprios (sem
    confirmação, igual ao web).
- **"Visto" simplificado**: em vez de `IntersectionObserver` por visibilidade de scroll (sem
  equivalente simples em Compose), chama `markPostsViewed` com os IDs de **toda a página** assim
  que ela termina de carregar (uma vez por `fetchFeed`), não por rolagem. É uma divergência
  deliberada do web — o sinal de ranking continua funcionando (posts já buscados não voltam a
  ranquear como "não vistos"), só perde a precisão de "realmente apareceu na tela".
- **`Destinations.kt`**: `PopOverRoutes.Comments = "post/{postId}/comments"` + uma função helper
  (ex.: `fun commentsRoute(postId: String) = "post/$postId/comments"`) pra montar a rota com o
  argumento real ao navegar.
- **`LajesFitNavGraph.kt`**: `composable(PopOverRoutes.Comments, arguments = listOf(navArgument(
  "postId") { type = NavType.StringType }))`, lendo `postId` do `NavBackStackEntry.arguments`.
  `FeedScreen` navega com `navController.navigate(commentsRoute(post.id))`. O `composable(
  PopOverRoutes.CreatePost)` já existe do M0, só troca o `CreatePostScreen` placeholder pelo real
  (assinatura `onDone` não muda).

## Fora do escopo deste marco (propositalmente)

- Upload de imagem/vídeo no `CreatePostScreen` (picker de mídia, compressão, upload pro bucket
  `media`, validação de duração de vídeo) — "texto simples" é aceitável nesta fase
  (`specs/PLANO.md:127`).
- Reprodução de vídeo inline nos posts (ExoPlayer/Media3 não é dependência do projeto ainda).
- Compartilhar post (Web Share API / sheet com WhatsApp/Instagram/copiar link no web) — não afeta a
  funcionalidade central do feed.
- Rastreamento preciso de "visto" via visibilidade real de scroll — ver simplificação acima.
- `fetchProfilePosts`/`fetchWorkoutPost` (usados só na tela de Perfil) e qualquer coisa de
  seguir/privacidade além do que a RPC já filtra sozinha no servidor — isso é M7.
- Consumir a tabela `notifications` (as linhas já são criadas automaticamente por trigger; exibi-las
  é M8).

## Feito quando

- [ ] Abrir o Feed carrega posts reais paginados via `get_feed_post_ids` (inclusive posts que já
      existem no banco compartilhado, criados via web).
- [ ] "Carregar mais" busca a próxima página e concatena; desabilita quando a página vem incompleta.
- [ ] Curtir/descurtir atualiza a UI na hora (otimista) e persiste (conferir reabrindo o feed).
- [ ] Apagar o próprio post (com confirmação) remove da lista e do banco; a opção não aparece em
      posts de outros usuários.
- [ ] Criar post (texto) grava em `posts` e aparece no feed depois de recarregar.
- [ ] Abrir os comentários de um post (tela separada) lista os comentários reais, permite adicionar
      um novo e apagar um comentário próprio.
- [ ] Posts com `media_url` (imagem, não-vídeo) mostram a imagem via Coil. Se já existir algum post
      de treino/dieta no banco (criado via web), conferir que o badge e o bloco de treino aparecem
      certos — não é bloqueante se não houver nenhum pra testar ainda.

## Notas para o próximo marco (M4)

- `createPost`/`CreatePostScreen` ganham upload de imagem quando fizer sentido (refinamento futuro,
  não necessariamente M4) — ver "Fora do escopo".
- O padrão de hidratação paralela (`kotlinx.coroutines.async`) e os modelos de `profiles`/`workouts`
  criados aqui devem ser **reusados**, não recriados, por telas futuras que precisem dos mesmos
  dados (Perfil no M7, Treinos no M5).
