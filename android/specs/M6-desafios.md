# M6 - Desafios

Status: **aprovado em 2026-07-09; sub-partes 1 e 2 concluidas**. A tela Android real de desafios
foi implementada e validada; proximos ajustes devem ser tratados como polimento novo, se o usuario
pedir.

## Objetivo

Portar a aba **Desafio** do web (`src/features/challenges/*` e `src/routes/desafio.tsx`) para o
Android nativo: card/hero do desafio do mes, carregamento do desafio ativo, rankings mensais reais
e ranking de peso perdido, usando as RPCs e tabelas ja existentes no Supabase. A primeira versao
deve substituir o placeholder atual em `feature/challenges/ChallengesScreen.kt` por uma tela real
integrada ao `BottomNavDestination.Challenges`.

## Decisao de escopo para aprovacao

O `specs/PLANO.md` antigo menciona "entrar (`challenge_participants`)". Ao ler o codigo real do web,
nao existe hoje um fluxo de usuario comum para entrar manualmente no desafio ou informar peso:

- `ChallengePage.tsx` apenas chama `ensureChallengeLifecycle()` para usuarios logados e mostra os
  rankings.
- `challenge_participants` e os pesos aparecem no ranking de "Peso perdido", mas a escrita de peso
  no web esta isolada em `AdminParticipantsCard.tsx`, comentada/oculta na pagina.
- As notificacoes de "entrou no rank" sao disparadas quando um usuario novo registra treino ou
  refeicao, nao quando ele insere `challenge_participants`.

Portanto, esta spec propoe **nao inventar um formulario de entrada/peso no Android M6**. Para manter
paridade com o web atual, o Android M6 mostra os rankings e chama o lifecycle; escrita em
`challenge_participants`/admin fica fora do escopo. Se o produto deve voltar a ter botao "Entrar no
desafio" com peso inicial, isso precisa ser aprovado explicitamente antes da implementacao.

## Comportamento do web a espelhar

Lido em `src/features/challenges/ChallengePage.tsx`, `challenges-api.ts`, `ChallengeCard.tsx`,
`RankingList.tsx`, `PodiumCard.tsx`, `routes/desafio.tsx` e nas migrations de desafios:

- Ao abrir a pagina logado, o web chama `ensure_challenge_lifecycle()`:
  - fecha desafios ativos vencidos;
  - cria o desafio do mes atual se nao existir;
  - carrega participantes do mes anterior para o novo desafio usando o peso final/inicial.
- Em seguida carrega:
  - desafio ativo (`challenges` com `status = 'active'`);
  - ultimo desafio fechado (`status = 'closed'`, `period_end DESC`) para podio anterior;
  - ranking de peso perdido do desafio ativo via `get_challenge_leaderboard(p_challenge_id)`;
  - top 3 de peso perdido do ultimo desafio fechado usando a mesma RPC;
  - ranking mensal de quantidade de treinos via `get_activity_count_leaderboard(p_limit := 100)`;
  - ranking mensal de dias com treino via `get_workout_days_leaderboard(p_limit := 100)`;
  - ranking mensal de distancia via `get_distance_leaderboard(p_limit := 100)`;
  - ranking mensal de calorias queimadas via `get_calories_leaderboard(p_limit := 100)`;
  - ranking mensal de dias com refeicoes via `get_diet_days_leaderboard(p_limit := 100)`.
- O web usa `Promise.allSettled`: falha em um ranking nao deve apagar os demais.
- A tela mostra seis cards principais:
  1. **Atividades**: mais treinos registrados no mes.
  2. **Dias ativos**: mais dias distintos com treino no mes.
  3. **Distancia**: maior distancia em `Corrida`, `Caminhada` e `Trilha`.
  4. **Calorias queimadas**: maior soma de calorias de treinos.
  5. **Peso perdido**: maior percentual de perda no desafio ativo.
  6. **Refeicoes**: mais dias distintos com refeicao registrada.
- O web tambem mostra "Podio do desafio anterior" quando existe top 3 de peso perdido do ultimo
  desafio fechado.
- Perfis privados ja sao filtrados pelas RPCs finais; o cliente nao deve duplicar filtro de
  privacidade.
- A rota web `/desafio` e publica para visitante anonimo. No Android nativo, a navegacao principal
  ja passa por auth/onboarding; M6 nao precisa criar uma experiencia publica/anonima.

## Schema e RPCs

Fonte da verdade: `../supabase/migrations/*.sql`.

- `challenges`: `id`, `period_start`, `period_end`, `status`, `created_at`.
- `challenge_participants`: `id`, `challenge_id`, `user_id`, `start_weight_kg`, `end_weight_kg`,
  `joined_at`, unique `(challenge_id, user_id)`. Peso em kg e privado por RLS; ranking exposto so
  por percentual via RPC.
- `ensure_challenge_lifecycle()` retorna o UUID do desafio atual e exige usuario autenticado.
- `get_challenge_leaderboard(p_challenge_id UUID)` retorna:
  `user_id`, `username`, `display_name`, `avatar_url`, `pct_loss`, `rank`.
- `get_activity_count_leaderboard(p_limit INT)` retorna:
  `user_id`, `username`, `display_name`, `avatar_url`, `total_activities`.
- `get_workout_days_leaderboard(p_limit INT)` retorna:
  `user_id`, `username`, `display_name`, `avatar_url`, `active_days`.
- `get_distance_leaderboard(p_limit INT)` retorna:
  `user_id`, `username`, `display_name`, `avatar_url`, `total_distance_meters`.
- `get_calories_leaderboard(p_limit INT)` retorna:
  `user_id`, `username`, `display_name`, `avatar_url`, `total_calories`.
- `get_diet_days_leaderboard(p_limit INT)` retorna:
  `user_id`, `username`, `display_name`, `avatar_url`, `active_days`.
- Nao ha migration nova prevista para M6.

## Arquitetura no Android

- **`feature/challenges/ChallengeModels.kt`**:
  - `Challenge` com `id`, `periodStart`, `periodEnd`, `status`;
  - modelo base de entrada ranqueada com `userId`, `username`, `displayName`, `avatarUrl`, `rank`;
  - modelos por metrica: atividades, dias ativos, distancia, calorias, percentual de peso;
  - enum/constantes para os seis cards, com titulo, descricao curta e formato de valor.
- **`ChallengeRepository.kt`**:
  - `ensureChallengeLifecycle()`;
  - `getActiveChallenge()`;
  - `getLastClosedChallenge()`;
  - `getWeightLeaderboard(challengeId)`;
  - `getActivityCountLeaderboard(limit = 100)`;
  - `getWorkoutDaysLeaderboard(limit = 100)`;
  - `getDistanceLeaderboard(limit = 100)`;
  - `getCaloriesLeaderboard(limit = 100)`;
  - `getDietDaysLeaderboard(limit = 100)`;
  - seguir o padrao dos repositorios existentes: `@Singleton`, `@Inject constructor(private val
    supabaseClient: SupabaseClient)`, rows privadas `@Serializable`, `@SerialName` para snake_case
    e chamadas via `supabaseClient.postgrest.rpc(...)`/`from(...)`.
- **`ChallengesViewModel.kt`**:
  - `@HiltViewModel`, `StateFlow<ChallengesUiState>`, `load()` e `refresh()`;
  - chamar `ensureChallengeLifecycle()` no carregamento quando houver sessao;
  - carregar cada ranking com `runCatching` separado para preservar os demais em caso de falha;
  - expor `currentUserId` para destacar "voce" nos rankings;
  - expor loading, empty state e erro geral sem travar a aba inteira se uma RPC falhar.
- **`ChallengesScreen.kt`**:
  - substituir o placeholder;
  - `@Preview(showBackground = true)` obrigatorio com dados de exemplo;
  - header do mes atual ("Desafios do mes") e texto curto;
  - cards/listas simples para os seis rankings, destacando top 3 e usuario atual;
  - lista completa em card expansivel/bottom sheet e podio visual ficam opcionais; para M6 basta
    uma lista simples, coerente e rolavel;
  - usar Coil/AsyncImage para avatar quando ja disponivel no projeto; fallback com inicial.
- **Navegacao**:
  - a rota de bottom nav `BottomNavDestination.Challenges.route` ja existe e aponta para
    `ChallengesScreen()`;
  - nao criar Activity nova;
  - nao precisa tocar em `Destinations.kt` ou `LajesFitNavGraph.kt` salvo se a implementacao optar
    por abrir detalhes de ranking em uma rota separada, o que esta fora da primeira versao.

## Fora do escopo deste marco

- Criar formulario de entrada no desafio ou escrita direta em `challenge_participants` pelo usuario
  comum.
- UI/admin para definir peso inicial/final de participantes (`AdminParticipantsCard`).
- Podio visual completo igual ao web; pode ficar para polimento.
- Pagina publica/anonima de desafio no Android.
- Navegar para perfil ao tocar em usuario do ranking (depende de M7).
- Notificacoes, push, deep-link para `/desafio` ou `challenge_dethroned` no Android (M8).
- Mudancas de schema/RPC/migrations.
- Cache offline.

## Feito quando

- [x] Aba **Desafio** deixa de ser placeholder e carrega dados reais do Supabase.
- [x] Ao abrir logado, o app chama `ensure_challenge_lifecycle()` sem quebrar a tela.
- [x] Desafio ativo aparece com periodo do mes atual quando existir.
- [x] Os seis rankings aparecem com dados reais, valores formatados e estado vazio individual:
      Atividades, Dias ativos, Distancia, Calorias queimadas, Peso perdido e Refeicoes.
- [x] Falha em um ranking nao impede que os demais sejam exibidos.
- [x] Usuario atual e destacado nas listas quando aparecer no ranking.
- [x] Perfis privados nao aparecem porque as RPCs ja filtram no servidor.
- [x] Nao ha fluxo Android novo escrevendo `challenge_participants` sem aprovacao explicita.
- [x] Tela nova tem `@Preview(showBackground = true)`.
- [x] `:app:assembleDebug` passa com `GRADLE_USER_HOME=.gradle-user-home`.

## Notas de execucao

Dividir em sub-partes pequenas, cada uma deixando o projeto compilando e fechando com commit pequeno:

1. **Repository + modelos + ViewModel**: **Concluido**. Criados `ChallengeModels.kt`,
   `ChallengeRepository.kt` e `ChallengesViewModel.kt`; a tela ainda segue como placeholder para a
   sub-parte 2. Build `:app:assembleDebug` confirmado em 2026-07-09 com `GRADLE_USER_HOME`
   repo-local; o Kotlin daemon falhou por ACL em `%LOCALAPPDATA%\kotlin\daemon`, mas o Gradle usou
   fallback sem daemon e terminou com `BUILD SUCCESSFUL`.
2. **Tela real de rankings**: **Concluido**. `ChallengesScreen.kt` substitui o placeholder por UI
   com header, loading, erros parciais, seis cards/listas, avatar/fallback e preview. Build
   `:app:assembleDebug`, `installDebug`, abertura do app e logcat sem crash confirmados em
   2026-07-09.
3. **Polimento leve e paridade**: **Coberto no fechamento da tela real**. A UI ja inclui formatacao
   de periodo/mes, valores (`km`, `kcal`, `%`, dias, treinos), destaque do usuario atual e empty
   states por ranking. Polimentos adicionais devem ser tratados como nova tarefa pequena.
