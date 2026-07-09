# M5 - Treinos

Status: **aprovado em 2026-07-09; sub-partes 1-3 Android concluidas** (historico/totais, treino
manual com foto e base Health Connect). A migration de Health Connect continua pendente porque fica
em `../supabase`, fora do writable root atual desta sessao.

## Objetivo

Portar a area de treinos do web (`WorkoutsPage.tsx` + `workouts-api.ts` +
`ManualWorkoutDialog.tsx`) para Android: historico de treinos, estatisticas basicas do mes,
**`AddWorkoutScreen`** para treino manual com foto, publicacao automatica no feed, e sincronizacao
manual com **Health Connect** no lugar de Strava. Incluir tambem a
**`HealthPermissionRationaleActivity`**, unica Activity extra do app, exigida pela Play Store para
permissoes de saude.

## Comportamento do web a espelhar

Lido em `src/features/workouts/WorkoutsPage.tsx`, `ManualWorkoutDialog.tsx`,
`workouts-api.ts`, `strava.server.ts`, `strava-api.ts`, `WeeklyWorkoutChart.tsx`,
`src/features/fitness/useFitness.ts` e `supabase/migrations/*.sql`:

- **Historico**: lista todos os treinos do usuario, ordenados por `performed_at DESC`.
- **Totais do mes atual**: quantidade de treinos, tempo total (`duration_seconds`), distancia total
  (`distance_meters`) e calorias totais (`calories`), somando apenas registros do mes/ano atual.
- **Treino manual** (`ManualWorkoutDialog.tsx`): campos de modalidade, nome, data/hora, distancia,
  calorias, horas, minutos e foto opcional. `Musculacao` nao mostra distancia. Modalidades exatas:
  `Corrida`, `Caminhada`, `Ciclismo`, `Musculacao`, `Trilha`, `Natacao`, `Outro`.
- **Criar treino manual** (`addWorkout`): insere em `workouts` com `user_id`, `activity_type`,
  `title`, `distance_meters`, `duration_seconds`, `calories` arredondado, `performed_at`,
  `media_url`. Depois insere um post em `posts` com `content = title ?: activity_type`,
  `media_url`, `workout_id` e `created_at = performed_at`.
- **Editar treino manual** (`updateWorkout`): atualiza a linha de `workouts` e mantem o post do feed
  sincronizado (`content`, `media_url`, `created_at`) pelo `workout_id`.
- **Excluir treino** (`removeWorkout`): deleta em `workouts` por `id` + `user_id`; o post relacionado
  cai junto por FK `posts.workout_id ON DELETE CASCADE`.
- **Foto de treino** (`uploadWorkoutPhoto`): sobe para o bucket `media`, path
  `${userId}/workouts/${Date.now()}-${safeName}`, e gera signed URL de 5 anos. No Android, aplicar a
  mesma regra de compressao ja usada no M4 para foto de refeicao: maximo 1400px no maior lado,
  JPEG qualidade 82.
- **Abrir post do treino**: o web abre o post relacionado no feed via `fetchWorkoutPost`. No Android
  M5 nao precisa criar uma tela/modal nova para isso; basta o Feed ja exibir posts de treino quando
  o usuario for para a aba Feed. Ver "Fora do escopo".
- **Strava**: nao portar `ConnectWithStravaButton`, OAuth, webhook, `strava_tokens` ou link
  "View on Strava" como funcionalidade Android. Usar o mapeamento de tipo de atividade de
  `strava.server.ts` apenas como referencia para categorizar sessoes do Health Connect.

## Schema

Fonte da verdade: `supabase/migrations/*.sql`, nao recriar schema em Kotlin.

- **`workouts` atual usado pelo web**: `id`, `user_id`, `source`, `strava_activity_id`,
  `activity_type`, `title`, `distance_meters`, `duration_seconds`, `calories`, `performed_at`,
  `media_url`, `created_at`. O schema inicial antigo tinha `name`/`started_at`, mas o codigo atual e
  migrations posteriores usam `title`/`performed_at`; o Android deve usar os nomes atuais.
- RLS de `workouts`: select para autenticados, insert/update/delete apenas do proprio usuario.
- **`posts.workout_id`** referencia `workouts(id) ON DELETE CASCADE`; criar/editar treino deve
  manter o post relacionado em sincronia como o web faz.
- Bucket **`media`** ja existe e permite escrita na pasta do proprio usuario.
- **Migration nova necessaria antes da sincronizacao Health Connect**:
  - adicionar fonte `health_connect` ao campo `source`. Como ha historico de migrations em que
    `source` aparece tanto como enum original quanto como `TEXT`, a migration deve ser defensiva:
    se `public.workout_source` ainda existir e for usado, adicionar o valor com `ALTER TYPE`; se a
    coluna for `TEXT`, nenhum enum novo e necessario.
  - adicionar `health_connect_record_id TEXT`.
  - adicionar indice unico para dedupe por usuario, preferencialmente:
    `CREATE UNIQUE INDEX workouts_user_health_connect_record_idx ON public.workouts(user_id, health_connect_record_id) WHERE health_connect_record_id IS NOT NULL;`
  - `NOTIFY pgrst, 'reload schema';`
- Nao precisa endpoint backend novo: o app le o Health Connect local e grava direto em `workouts` via
  Postgrest com a sessao autenticada.

## Health Connect

No Android, Health Connect substitui Strava neste marco.

- Dependencia esperada: `androidx.health.connect:connect-client`.
- Checar disponibilidade com `HealthConnectClient.getSdkStatus(context)`.
  - Se indisponivel por falta de app/provedor, mostrar CTA para abrir a Play Store/installer do
    Health Connect.
  - Se disponivel, criar `HealthConnectClient`.
- Pedir permissoes via `PermissionController.createRequestPermissionResultContract()`.
  - Permissao obrigatoria: leitura de `ExerciseSessionRecord`.
  - Permissoes adicionais devem ser incluidas conforme a implementacao de agregacao: calorias,
    distancia e frequencia cardiaca somente se forem realmente lidas.
- Ler `ExerciseSessionRecord` em um intervalo limitado. Para a primeira versao, importar do inicio
  do mes atual ate agora, alinhado aos rankings mensais e ao comportamento Strava do web que evita
  importar historico antigo demais.
- Para cada sessao:
  - usar `record.metadata.id` como `health_connect_record_id`;
  - mapear `exerciseType` para as categorias do app:
    `Corrida`, `Caminhada`, `Ciclismo`, `Musculacao`, `Trilha`, `Natacao`, `Outro`;
  - usar titulo/nome simples baseado na categoria se o Health Connect nao fornecer nome adequado;
  - `performed_at` = inicio real da sessao;
  - `duration_seconds` = duracao entre inicio e fim;
  - `distance_meters` e `calories` por agregacao no intervalo da sessao quando disponiveis;
  - `source = "health_connect"`;
  - `media_url = null`.
- Deduplicacao: reimportar duas vezes nao pode duplicar. Fazer upsert/conflito usando
  `(user_id, health_connect_record_id)` quando a migration estiver aplicada.
- Publicacao no feed: sessoes novas importadas tambem devem gerar post em `posts`, igual ao Strava
  faz no servidor web. Sessoes ja existentes devem atualizar o post relacionado se dados relevantes
  mudarem.
- Fora desta fase: sync automatico em background, webhook, escrita de dados de volta no Health
  Connect, importacao historica ilimitada.

## Arquitetura no Android

- **`feature/workouts/WorkoutModels.kt`**:
  - `WorkoutActivityType` ou constantes com as 7 modalidades;
  - `LocalWorkout` com `id`, `activityType`, `title`, `distanceMeters`, `durationSeconds`,
    `calories`, `performedAt`, `mediaUrl`, `source`, `healthConnectRecordId`;
  - modelos de input para criar/editar/importar.
- **`WorkoutRepository.kt`** (`@Singleton`, `@Inject constructor(private val supabaseClient:
  SupabaseClient)`):
  - `getWorkouts(): List<LocalWorkout>`;
  - `addWorkout(input): LocalWorkout`, com upload opcional de foto e insert de post;
  - `updateWorkout(id, input): LocalWorkout`, com update do post relacionado;
  - `removeWorkout(id)`;
  - `upsertHealthConnectWorkouts(rows): SyncResult`, com criacao/atualizacao de posts.
  - Seguir o padrao de `DietRepository.kt`/`FeedRepository.kt`: rows privadas `@Serializable`,
    `@SerialName` para snake_case, `Columns.list(...)` explicito.
- **`HealthConnectSync.kt`**:
  - encapsular disponibilidade, permissao, leitura de `ExerciseSessionRecord`, agregacao e
    mapeamento para inputs do repository;
  - manter Health Connect isolado da tela e do repository Supabase.
- **`WorkoutsViewModel.kt` + `WorkoutsScreen.kt`**:
  - trocar o placeholder por tela real;
  - carregar historico e expor `UiState`;
  - calcular totais do mes no ViewModel ou em funcao pura;
  - estados de loading, vazio, erro, sincronizando;
  - botao para "Registrar" deve navegar para `PopOverRoutes.AddWorkout`;
  - botao/CTA para sincronizar com Health Connect, pedindo permissao quando necessario.
- **`AddWorkoutViewModel.kt` + `AddWorkoutScreen.kt`**:
  - substituir o placeholder da rota `workout/add`;
  - formulario com modalidade, nome, data/hora, distancia condicional, calorias, horas, minutos e
    foto opcional;
  - resultado de sucesso deve voltar para `WorkoutsScreen` via `savedStateHandle`, seguindo o padrao
    das telas de feed/dieta;
  - `@Preview(showBackground = true)` obrigatorio.
- **`HealthPermissionRationaleActivity.kt`**:
  - Activity real, fora do `NavHost`, por exigencia da Play Store;
  - declarar no `AndroidManifest.xml` com intent-filter para
    `androidx.health.ACTION_SHOW_PERMISSIONS_RATIONALE`;
  - tela simples explicando quais dados de saude sao lidos e por que.
- **`AndroidManifest.xml`**:
  - declarar as permissoes Health Connect usadas;
  - declarar a `HealthPermissionRationaleActivity`;
  - manter `MainActivity` como Activity principal e unica Activity de navegacao.
- **`libs.versions.toml` / `app/build.gradle.kts`**:
  - adicionar apenas a dependencia de Health Connect necessaria para M5.

## Integracoes com marcos anteriores

- **Feed (M3)**: posts de treino ja sao exibidos por `workout_id`; M5 deve criar/atualizar esses
  posts como o web faz.
- **Dieta (M4)**: depois de M5, o resumo de dieta nao deve mais usar `queimado = 0`; deve somar as
  calorias de treinos do dia. Esta ligacao pode entrar como parte final do M5 se for pequena, ou
  ficar explicitamente para o primeiro refinamento apos M5 se aumentar o escopo.
- **Desafios (M6)**: leaderboards ja consultam `workouts`, entao treinos manuais e Health Connect
  precisam gravar campos coerentes (`performed_at`, `activity_type`, `distance_meters`, `calories`).

## Fora do escopo deste marco

- Strava no app Android: OAuth, conectar/desconectar, webhook, tela de configuracao Strava, link
  "View on Strava" e uso de `strava_tokens`.
- Sync Health Connect em background (`WorkManager`) ou periodico.
- Escrita de treino de volta no Health Connect.
- Importar todo o historico do usuario desde sempre; primeira versao importa do mes atual.
- Graficos semanais detalhados na tela de Treinos; os totais do mes bastam.
- Abrir o `PostCard` do treino a partir do historico em um modal. O post ja aparece no Feed.
- Compartilhamento de treino, edicao avancada de post gerado, video ou multiplas fotos.

## Feito quando

- [ ] Existe migration para `health_connect_record_id`/dedupe e ela e compativel com o schema atual.
- [x] Abrir Treinos mostra historico real do usuario a partir de `workouts`, com estado vazio e
      loading.
- [x] A tela mostra totais do mes coerentes: treinos, tempo, distancia e calorias.
- [x] Registrar treino manual com ou sem foto grava em `workouts`, cria post em `posts` e aparece no
      historico.
- [x] Editar um treino manual atualiza `workouts` e o post relacionado.
- [x] Excluir treino remove o registro e o post relacionado deixa de aparecer por cascade.
- [x] Health Connect mostra estado correto quando indisponivel, quando falta permissao e quando esta
      pronto para sincronizar.
- [ ] Conceder permissao e sincronizar importa sessoes reais do dispositivo para `workouts`.
- [ ] Rodar a sincronizacao duas vezes nao duplica sessoes ja importadas.
- [ ] Treinos importados do Health Connect tambem geram posts no feed.
- [x] `HealthPermissionRationaleActivity` esta declarada no manifest com o intent-filter correto.
- [ ] Todas as telas novas tem `@Preview(showBackground = true)`.

## Notas de execucao

Dividir a implementacao em sub-partes pequenas, cada uma deixando o projeto compilando e fechando com
commit pequeno:

1. **Schema + leitura real**: migration Health Connect, modelos/repository de leitura, tela
   `WorkoutsScreen` com historico e totais do mes. **Android concluido**; migration pendente em
   `../supabase`.
2. **Treino manual**: `AddWorkoutScreen`, upload de foto, criar/editar/excluir treino e manter post
   do feed em sincronia. **Concluido no Android**.
3. **Health Connect base**: dependencia, manifest, rationale Activity, disponibilidade e fluxo de
   permissao. **Concluido no Android**.
4. **Importacao Health Connect**: leitura/agregacao de sessoes, dedupe, upsert em `workouts`,
   criacao/atualizacao de posts e teste de reimportacao.
5. **Ligacao com Dieta**: se couber sem abrir demais o escopo, somar calorias de treinos do dia no
   resumo do M4; caso contrario, deixar como refinamento logo apos M5.
