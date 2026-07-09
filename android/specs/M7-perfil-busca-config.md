# M7 - Perfil, busca e configuracoes

Status: **aprovado em 2026-07-09; sub-parte 1 concluida**. Implementar as proximas sub-partes
conforme as notas de execucao; nao empilhar mais de uma sub-parte na mesma sessao.

## Objetivo

Portar para o Android nativo as areas de **perfil**, **busca de pessoas** e **configuracoes** do web
app (`src/features/profile/*`, `src/features/settings/*`, `src/features/auth/auth.ts` e migrations
relacionadas), mantendo o mesmo Supabase, mesmas RLS e o padrao MVVM/Compose ja usado no projeto.

Ao fim do marco, o usuario deve conseguir:

- abrir o proprio perfil e perfis de outros usuarios;
- ver estatisticas e posts permitidos pela privacidade;
- seguir perfis publicos, solicitar acesso a perfis privados, cancelar solicitacao e deixar de
  seguir;
- aceitar ou recusar solicitacoes recebidas quando o proprio perfil for privado;
- buscar pessoas por usuario ou nome;
- editar nome, bio, avatar, privacidade e preferencias de notificacao;
- trocar/definir senha, atualizar e-mail de recuperacao e sair da conta.

## Decisoes de escopo para aprovacao

1. **Adicionar acesso nativo a perfil/busca/configuracoes.** O Android hoje tem bottom-nav + FAB,
   mas nao tem o header do web. M7 deve adicionar um topo autenticado simples no `Scaffold` com
   logo/titulo, acao de busca e avatar do usuario para abrir o proprio perfil. O sino/lista de
   notificacoes fica fora ate M8.
2. **Notificacoes em M7 sao apenas preferencias no perfil.** M7 edita `notifications_enabled`,
   `notify_likes`, `notify_comments`, `notify_follows` e `notify_challenges`. Registro de token,
   permissao push, FCM, lista de notificacoes, contador nao-lido e deep-link ao tocar em push
   pertencem ao M8.
3. **Nao portar Strava para Android.** A pagina web de configuracoes tem cartoes de Strava e webhook
   admin. No Android nativo isso continua fora do escopo por decisao do plano: treinos automaticos
   usam Health Connect (M5), nao Strava.
4. **Username continua somente leitura.** Igual ao web, configuracoes mostram o usuario atual sem
   permitir edicao de `profiles.username`.
5. **E-mail de recuperacao usa Supabase Auth.** A UI deve chamar `auth.updateUser(email = ...)` pelo
   fluxo Android existente, nao gravar `profiles.recovery_email` diretamente. A coluna existe no
   schema, mas o web atual tambem troca o e-mail real via Auth.
6. **Sem migration nova prevista.** As tabelas/colunas necessarias ja existem nas migrations
   atuais.

## Comportamento do web a espelhar

### Perfil

Lido em `src/features/profile/ProfilePage.tsx` e `follows-api.ts`:

- A rota web `/profile/$username` carrega `profiles` por `username` com:
  `id`, `username`, `display_name`, `avatar_url`, `bio`, `is_private`.
- Se o perfil nao existir, mostra erro/estado de "perfil nao encontrado".
- Carrega contadores via queries `head` com `count = exact`:
  - seguidores: `follows.following_id = profile.id`;
  - seguindo: `follows.follower_id = profile.id`;
  - treinos: `workouts.user_id = profile.id`;
  - posts: `posts.user_id = profile.id`.
- Para o usuario logado, detecta:
  - follow aceito em `follows` (`following_id = profile.id`, `follower_id = currentUserId`);
  - solicitacao pendente em `follow_requests` (`requested_id = profile.id`,
    `requester_id = currentUserId`).
- O status de follow e:
  - `none`: nao segue e nao solicitou;
  - `requested`: solicitacao pendente para perfil privado;
  - `following`: follow aceito.
- Posts do perfil aparecem quando:
  - e o proprio usuario;
  - ou o usuario atual segue o perfil;
  - ou o perfil e publico.
- Se o perfil e privado e o usuario nao segue, a tela mostra estado bloqueado e nao busca posts.
- Perfil proprio e privado mostra solicitacoes recebidas (`follow_requests.requested_id = user.id`)
  com botoes aceitar/recusar.
- Acoes:
  - seguir perfil publico: inserir em `follows`;
  - solicitar perfil privado: inserir em `follow_requests`;
  - cancelar solicitacao: deletar em `follow_requests`;
  - deixar de seguir: deletar em `follows`;
  - aceitar solicitacao: inserir em `follows` com `follower_id = requesterId` e
    `following_id = currentUserId`, depois deletar a solicitacao;
  - recusar solicitacao: deletar a solicitacao.
- Posts do perfil usam `fetchProfilePosts(profileUserId, currentUserId)`:
  `posts` por `user_id`, `created_at DESC`, limite 50, hidratados com os mesmos dados de feed.
- Post proprio pode ser apagado pelo mesmo fluxo ja existente no feed.

### Busca

Lido em `src/features/profile/SearchPage.tsx` e `search-api.ts`:

- Campo de busca por usuario ou nome.
- Debounce de 300 ms.
- `query.trim().replace(/[,()%*]/g, "")`; se o resultado tiver menos de 2 caracteres, nao busca.
- Query em `profiles`:
  - seleciona `id`, `username`, `display_name`, `avatar_url`;
  - `username.ilike.%safeQuery%` ou `display_name.ilike.%safeQuery%`;
  - exclui o usuario atual com `.neq("id", currentUserId)`;
  - limite 20.
- Cada resultado abre `profile/{username}`.

### Configuracoes

Lido em `src/features/settings/SettingsPage.tsx`, `settings-api.ts` e `auth.ts`:

- Carrega de `profiles`:
  `username`, `display_name`, `bio`, `avatar_url`, `recovery_email`, `is_admin`, `is_private`,
  `notifications_enabled`, `notify_likes`, `notify_comments`, `notify_follows`,
  `notify_challenges`.
- Perfil:
  - `username` desabilitado;
  - editar `display_name`, `bio`, `avatar_url`;
  - upload de avatar no bucket `media`, path `${userId}/avatar-${Date.now()}`, `upsert = true`,
    signed URL de 5 anos, depois update em `profiles.avatar_url`.
- Privacidade:
  - alterna `profiles.is_private`;
  - texto diferencia perfil publico e privado.
- Preferencias de notificacao:
  - chave geral `notifications_enabled`;
  - chaves por tipo: curtidas, comentarios, novos seguidores e desafio;
  - os toggles por tipo ficam desabilitados visualmente quando o geral estiver desligado.
- Seguranca:
  - conta com provider `email`: pede senha atual, reautentica com `signInWithPassword` e depois
    chama `auth.updateUser(password = newPassword)`;
  - conta sem provider `email` (ex.: Google): permite definir uma senha nova;
  - senha minima de 6 caracteres, igual ao web;
  - e-mail real/recuperacao: chama `auth.updateUser(email = cleanEmail)` e informa que ha link de
    confirmacao pendente;
  - logout chama `auth.signOut()` e volta para o fluxo de auth.

## Schema e RLS

Fonte da verdade: `../supabase/migrations/*.sql`.

- `profiles`:
  - base: `id`, `username`, `display_name`, `avatar_url`, `bio`, metas de dieta/treino;
  - M7 usa tambem `is_private`, `is_admin`, `recovery_email`, `notifications_enabled`,
    `notify_likes`, `notify_comments`, `notify_follows`, `notify_challenges`.
- `follows`:
  - colunas: `follower_id`, `following_id`, `created_at`;
  - insert direto pelo follower so funciona para perfil publico;
  - insert de follow para perfil privado e feito pelo dono do perfil ao aceitar uma solicitacao;
  - delete permitido para envolvidos.
- `follow_requests`:
  - chave primaria `(requester_id, requested_id)`;
  - insert permitido apenas pelo requester e apenas para perfil privado;
  - select/delete permitido para envolvidos.
- `posts_select_visible_auth` ja filtra posts privados no servidor, mas a tela ainda deve esconder
  a secao de posts antes de buscar quando o usuario nao tem permissao.
- `notifications_enabled` e preferencias por tipo sao lidas pelos triggers no servidor. O cliente
  apenas atualiza as colunas em `profiles`.
- Nao ha migration nova planejada para M7.

## Arquitetura no Android

### Navegacao e chrome autenticado

- Adicionar rotas em `navigation/Destinations.kt`, por exemplo:
  - `ProfileRoutes.Search = "search"`;
  - `ProfileRoutes.Settings = "settings"`;
  - `ProfileRoutes.Profile = "profile/{username}"`;
  - helper `profileRoute(username: String)`.
- Registrar os destinos em `navigation/LajesFitNavGraph.kt`.
- `ProfileScreen` recebe `username` por argumento de rota.
- `SearchProfilesScreen` navega para `profile/{username}` ao tocar no resultado.
- `SettingsScreen` volta para o perfil/feed conforme o fluxo local exigir.
- `MainActivity.kt` ganha top bar autenticada simples:
  - logo/titulo;
  - botao de busca;
  - avatar do usuario atual abrindo o proprio perfil;
  - sem sino de notificacoes em M7.
- `FeedScreen` deve passar callback para abrir perfil ao tocar no autor do post.
- Quando a M6 estiver consolidada, os cards de ranking podem receber callback para perfil, mas isso
  pode ficar para a sub-parte de integracao/polimento de M7 para nao misturar com a M6 pausada.

### `feature/profile`

Criar a pasta `feature/profile/` com:

- **`ProfileModels.kt`**
  - `UserProfile`;
  - `ProfileCounts`;
  - `FollowStatus` (`NONE`, `REQUESTED`, `FOLLOWING`);
  - `IncomingFollowRequest`;
  - `ProfileSearchResult`.
- **`ProfileRepository.kt`**
  - `currentUserId()`;
  - `currentProfileSummary()` para o top bar;
  - `getProfileByUsername(username)`;
  - `getProfileCounts(profileId)`;
  - `getFollowStatus(profileId, currentUserId)`;
  - `fetchIncomingFollowRequests(userId)`;
  - `sendFollowOrRequest(currentUserId, targetProfile)`;
  - `cancelFollowRequest(currentUserId, targetProfileId)`;
  - `unfollowProfile(currentUserId, targetProfileId)`;
  - `acceptFollowRequest(currentUserId, requesterId)`;
  - `declineFollowRequest(currentUserId, requesterId)`;
  - `searchProfiles(query, excludeUserId)`.
- **`ProfileViewModel.kt`**
  - `StateFlow<ProfileUiState>`;
  - `load(username)`/`refresh()`;
  - acoes de follow/request/cancel/unfollow/accept/decline;
  - atualizacao otimista simples para contadores quando seguro;
  - recarregar perfil apos aceitar/recusar quando necessario.
- **`ProfileScreen.kt`**
  - header com avatar, nome, username, bio e botao de configuracoes quando for o proprio usuario;
  - contadores: posts, treinos, seguidores, seguindo;
  - botao Seguir/Solicitar/Solicitado/Seguindo para perfil de terceiros;
  - card de solicitacoes recebidas para perfil proprio privado;
  - lista de posts do perfil usando o mesmo visual de feed onde for viavel;
  - estado bloqueado para perfil privado sem follow;
  - `@Preview(showBackground = true)`.
- **`SearchProfilesScreen.kt`** e opcionalmente `SearchProfilesViewModel.kt`
  - debounce de 300 ms;
  - estados: input menor que 2, buscando, vazio, erro e resultados;
  - `@Preview(showBackground = true)`.

Para posts de perfil, preferir reutilizar a hidratacao existente em `FeedRepository`. O caminho
esperado e adicionar um metodo publico `fetchProfilePosts(profileUserId: String, limit = 50)` em
`FeedRepository` em vez de duplicar toda a montagem de `FeedPost` em `ProfileRepository`.

### `feature/settings`

Criar a pasta `feature/settings/` com:

- **`SettingsRepository.kt`**
  - `getProfileSettings(userId)`;
  - `updateProfileSettings(userId, displayName, bio, avatarUrl)`;
  - `uploadAvatar(userId, imageBytes)`;
  - `updateProfilePrivacy(userId, isPrivate)`;
  - `updateNotificationsEnabled(userId, enabled)`;
  - `updateNotificationPreference(userId, updates)`;
  - funcoes de seguranca podem ficar em `AuthRepository` se forem autentificacao, nao Postgrest.
- **`SettingsViewModel.kt`**
  - carrega perfil atual;
  - controla estados de salvamento/upload/toggles;
  - chama `AuthRepository` para e-mail, senha e logout;
  - expoe eventos de sucesso/erro para a tela.
- **`SettingsScreen.kt`**
  - editor de avatar com Photo Picker nativo (`ActivityResultContracts.PickVisualMedia`) para
    evitar permissao de armazenamento;
  - campos usuario, nome e bio;
  - card de privacidade;
  - card de preferencias de notificacao;
  - card de seguranca (senha/e-mail);
  - card de sair;
  - sem card Strava;
  - `@Preview(showBackground = true)`.

### `feature/auth`

Estender `AuthRepository.kt` quando necessario:

- `hasPasswordLogin(user)` equivalente ao web: checar se providers contem `email`;
- `setPassword(newPassword)`;
- `changePassword(currentPassword, newPassword)`;
- `setRealEmail(email)` ja existe e deve ser reaproveitado para o e-mail de recuperacao;
- `logout()` ja existe.

## Fora do escopo deste marco

- Firebase Cloud Messaging, `google-services.json`, registro de token FCM, migration de
  `push_subscriptions`, permissao push, lista/contador de notificacoes e deep-links de notificacao
  (M8).
- Strava, webhook admin de Strava, conectar/desconectar Strava ou qualquer OAuth de treino no app
  Android.
- Paginas publicas/anonimas de perfil ou busca. O Android segue autenticado/onboarding.
- Edicao de username.
- Tela completa de seguidores/seguindo.
- Recursos admin de desafio, peso de participante ou dashboard admin.
- Cache offline/Room.
- Mudancas de schema/RPC/migrations.
- Reproducao completa de video em posts; manter o comportamento atual do feed se aparecer media de
  video.

## Feito quando

- [x] App tem acesso visivel a busca e ao proprio perfil pelo chrome autenticado.
- [x] Rota `profile/{username}` carrega perfil real por username, com avatar/nome/bio/contadores.
- [x] Perfil publico de terceiro mostra posts e permite seguir/deixar de seguir.
- [x] Perfil privado de terceiro mostra estado bloqueado, permite solicitar/cancelar solicitacao e
      mostra posts apenas apos follow aceito.
- [x] Perfil proprio privado mostra solicitacoes recebidas e permite aceitar/recusar.
- [x] Posts do perfil usam dados reais, respeitam privacidade e permitem apagar post proprio.
- [x] Busca de pessoas replica sanitizacao, debounce, limite 20 e abre o perfil selecionado.
- [ ] Configuracoes carregam e salvam nome, bio, avatar, privacidade e preferencias de notificacao.
- [x] Avatar sobe para o bucket `media`, gera signed URL de 5 anos e atualiza `profiles.avatar_url`.
- [ ] Trocar/definir senha, atualizar e-mail real e sair da conta funcionam contra Supabase Auth.
- [ ] Nenhum fluxo de Strava ou FCM e implementado em M7.
- [ ] Telas novas tem `@Preview(showBackground = true)`.
- [ ] `:app:assembleDebug` passa com `GRADLE_USER_HOME=.gradle-user-home`.

## Notas de execucao

M7 e grande; dividir em sub-partes pequenas, uma por sessao/commit, deixando o app compilando:

1. **Navegacao + chrome autenticado**: **Concluido**. Criadas rotas
   `search`, `settings` e `profile/{username}`, top bar autenticada com busca e avatar do usuario
   atual, helper `ProfileRoutes.profileRoute(username)`, repository/ViewModel minimo para o resumo
   do topo e placeholders compilaveis para perfil/busca/configuracoes. Build `:app:assembleDebug`,
   `installDebug`, abertura do app e logcat sem crash confirmados em 2026-07-09.
2. **Perfil read-only + posts**: **Concluido**. `ProfileRepository`, `ProfileViewModel` e
   `ProfileScreen` carregam perfil real por username, contadores, status de follow para decidir
   privacidade e posts do perfil via `FeedRepository.fetchProfilePosts()`. `PostCard` foi
   reutilizado pelo perfil e o feed agora navega para o perfil do autor. Build `:app:assembleDebug`
   confirmado em 2026-07-09.
3. **Follow requests**: **Concluido**. `ProfileRepository` agora escreve em `follows` e
   `follow_requests` seguindo as RLS existentes: seguir perfil publico, solicitar perfil privado,
   cancelar, deixar de seguir, aceitar e recusar solicitacoes. `ProfileScreen` mostra o botao de
   follow conforme status e o card de solicitacoes recebidas no perfil proprio privado. Build
   `:app:assembleDebug` confirmado em 2026-07-09.
4. **Busca de pessoas**: **Concluido**. `SearchProfilesViewModel` aplica debounce de 300 ms e
   sanitizacao equivalente ao web; `ProfileRepository.searchProfiles()` busca por username e
   display name, exclui o usuario atual, mescla duplicados e limita a 20 resultados; a tela mostra
   campo de busca, loading, vazio, erro e abre `profile/{username}`. Build `:app:assembleDebug`
   confirmado em 2026-07-09.
5. **Configuracoes de perfil**: **Concluido**. `SettingsRepository`, `SettingsViewModel` e
   `SettingsScreen` carregam `profiles`, editam nome/bio, fazem upload de avatar no bucket
   `media` com signed URL de 5 anos e atualizam privacidade. A tela usa Photo Picker nativo, sem
   permissao de armazenamento, e nao porta Strava. Build `:app:assembleDebug` confirmado em
   2026-07-09.
6. **Seguranca e preferencias**: notificacoes por tipo, e-mail, senha, logout e polimento final.

Nao iniciar uma sub-parte nova enquanto a anterior nao estiver validada e commitada. Como a M6
sub-parte 2 esta pausada em validacao, concluir/commitar a M6 antes de implementar M7 evita misturar
diffs de desafios com perfil/busca/configuracoes.
