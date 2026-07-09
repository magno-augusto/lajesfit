# M2 — Onboarding (IDR)

Status: **implementado nesta sessão, compila limpo (`./gradlew :app:compileDebugKotlin`), pendente
de teste real em dispositivo/emulador.** Ver checklist "Feito quando" abaixo.

## Objetivo

Portar `/setup` (`src/features/goals/IdrSetup.tsx`) para Android: formulário nome/usuário/sexo/
idade/peso/altura/nível de atividade que calcula e grava o objetivo calórico diário (mesma fórmula
de Harris-Benedict + fator de atividade de `calculateIdr`, `src/features/goals/goals-api.ts:60-67`).
Integra ao gate de navegação — sessão autenticada, sem pendência de e-mail legado, mas sem
`idrProfile` ainda → força este formulário antes de liberar Feed/Dieta/Treinos/Desafio, igual ao
`app-shell.tsx:96` (`if (!idrProfile) navigate({ to: "/setup" })`).

## Comportamento do web a espelhar (fonte da verdade)

Lido em `src/features/goals/goals-api.ts` e `src/features/goals/IdrSetup.tsx`:

- **Fórmula** (`calculateIdr`, `goals-api.ts:60-67`): Harris-Benedict —
  `10*peso + 6.25*altura - 5*idade + 5` (homem) ou `... - 161` (mulher) — multiplicado pelo fator de
  atividade e arredondado (`Math.round`). Fatores (`ACTIVITY_FACTORS`, `goals-api.ts:29-41`, portar
  os labels **literalmente**, são o texto que o usuário vê):
  - `sedentary` (1.2): "Trabalho sentado, pouca movimentacao no dia"
  - `light` (1.3): "Fica em pe boa parte do dia (vendas, professor, recepcao)"
  - `moderate` (1.4): "Caminha bastante no dia a dia (entregador, garcom, cuidador)"
  - `active` (1.5): "Trabalho fisico pesado (construcao, mudancas, carga e descarga)"
  - `very_active` (1.6): "Trabalho fisico muito intenso o dia inteiro"
- **`getIdrProfile`** (`goals-api.ts:70-83`): `select` em `profiles` (`display_name, created_at,
  updated_at, calorie_goal, goal_sex, goal_age, goal_weight_kg, goal_height_cm,
  goal_activity_level`) `.eq("id", userId)`. `mapProfile` retorna **null se `calorie_goal` for
  null/0** (`goals-api.ts:45`) — é esse null que aciona o gate de onboarding, não uma coluna
  separada de "onboarding completo".
- **`getMyUsername`/`checkUsernameAvailable`** (`goals-api.ts:85-104`): username já existe desde o
  cadastro (trigger `handle_new_user`, `supabase/migrations/20260624120000_...sql` — gera um
  username a partir de `raw_user_meta_data.username` ou do e-mail/nome do Google, com sufixo
  numérico se colidir). O campo do formulário **nunca começa vazio**; é só editável, pra quem quer
  trocar. Checagem de disponibilidade re-executada no submit (`checkUsernameAvailable`) além da
  validação ao digitar — evita corrida entre dois usuários pegando o mesmo nome.
- **`saveIdrProfile`** (`goals-api.ts:113-143`): `update` em `profiles` (não RPC) —
  `display_name`, `calorie_goal` (calculado), `goal_sex/age/weight_kg/height_cm/activity_level`, e
  `username` só se veio preenchido. Erro `23505` (unique violation do username) vira mensagem
  amigável "Esse nome de usuario acabou de ser escolhido por outra pessoa. Tente outro." — outros
  erros propagam a mensagem crua do Postgrest.
- **Formulário** (`IdrSetup.tsx`): página única, **não é wizard multi-etapa**. Campos: Nome (texto,
  obrigatório), Usuário (prefill via `getMyUsername`, normalizado com `normalizeUsername` — mesma
  função de `auth.ts:9-14` —, mínimo 3 caracteres), Sexo biológico (female/male), Idade (12–100),
  Peso kg (30–250, aceita decimal), Altura cm (120–230), Nível de atividade (os 5 acima). **Preview
  ao vivo** da meta calórica (`calculateIdr` recalculado a cada mudança de campo, mostrado antes de
  salvar). Botão único "Salvar objetivo e abrir app" — sem opção de pular (diferente da
  `RequireEmailScreen` do M1, que tem "Continuar por agora"; aqui o formulário é obrigatório).
- **Pós-submit**: navega para `/feed` substituindo o histórico (não dá pra voltar pro formulário).

## Arquitetura no Android

- **`feature/goals/`** (pasta nova):
  - **`ProfileGoalsRow.kt`** (ou nome similar) — primeiro `@Serializable data class` do projeto pra
    decodificar uma linha do Postgrest fora de RPC (`display_name`, `calorie_goal`, `goal_sex`,
    `goal_age`, `goal_weight_kg`, `goal_height_cm`, `goal_activity_level`, `username` conforme
    necessário por chamada — nomes de coluna batendo com `supabase/migrations/20260618120000_add_
    calorie_goal_to_profiles.sql`). Estabelece o padrão de serialização pra Postgrest que os
    próximos marcos (M3+) vão reusar.
  - **`GoalsRepository.kt`** — porta 1:1 de `goals-api.ts`: `ACTIVITY_FACTORS` (map de enum/sealed
    class pro fator+label), `calculateIdr`, `getIdrProfile(): IdrProfile?`, `getMyUsername(): String`,
    `checkUsernameAvailable(username: String): Boolean`, `saveIdrProfile(profile, username?)` via
    `supabaseClient.postgrest["profiles"].update { ... }.eq("id", userId)` (padrão análogo ao
    `AuthRepository`, usando `supabaseClient.auth.currentUserOrNull()!!.id` como userId — mesmo
    `getUserId()` do web).
  - **`SetupScreen.kt` + `SetupViewModel.kt`** — formulário único (Compose, Material 3), com preview
    reativo da meta calórica e os mesmos textos/rótulos do web.
- **Gate de navegação — mudança de arquitetura em relação ao M1**: `needsRealEmail` é síncrono
  (derivado direto do JWT em `sessionStatus`), mas `idrProfile` exige uma consulta de rede. Os
  pontos que hoje decidem `Feed` direto precisam de uma fase de espera adicional antes de decidir:
  - `MainActivity.kt` (`LajesFitAppRoot`, `startDestination` — hoje um `remember { }` síncrono,
    `MainActivity.kt:117-124`): precisa observar um estado que só resolve depois do fetch do
    `idrProfile` (quando autenticado e sem `needsRealEmail`), não pode continuar sendo puramente
    síncrono a partir de `sessionStatus`.
  - `LajesFitNavGraph.kt`, `postLoginDestination` (`LajesFitNavGraph.kt:101-108`, hoje uma função
    síncrona usada em 2 lugares — `onLoginSuccess` do Login e `onDone` do ResetPassword): precisa
    também checar `idrProfile == null` antes de resolver `Feed`, o que a torna assíncrona.
  - `RequireEmailScreen`'s `onSkip` (hoje hardcoded pra `BottomNavDestination.Feed.route` em
    `LajesFitNavGraph.kt:88-91`): depois de pular o e-mail legado, o próximo gate ainda é
    `idrProfile` — não pode ir direto pro Feed.
  - **Proposta**: estender `AuthGateViewModel` (`feature/auth/AuthGateViewModel.kt`) com um
    `StateFlow` de estado selado (`Loading`, `Unauthenticated`, `NeedsRealEmail`, `NeedsOnboarding`,
    `Ready`) que injeta `GoalsRepository` e resolve o fetch do `idrProfile` uma vez por sessão
    autenticada válida (não a cada recomposição). `LajesFitAppRoot` e `postLoginDestination` passam
    a consumir esse estado único em vez de duplicar a lógica de decisão em 3 lugares. Validar esse
    desenho durante a implementação — é a parte do marco com mais grau de liberdade de design;
    manter a essência (uma fonte única da verdade pro gate, não 3 cópias da mesma lógica) é o que
    importa, não a forma exata da sealed class.
- **`Destinations.kt`**: nova rota em `AuthRoutes` (ex.: `Setup = "auth/setup"`), incluída em
  `AuthRoutes.all` (controla quando a bottom bar/FAB aparecem — `MainActivity.kt:137` — Setup não
  deve mostrar chrome, igual às outras rotas de auth, mesmo estando "autenticado").
- **Nenhuma tabela/coluna nova.** Reusa `profiles.calorie_goal`/`goal_*`
  (`supabase/migrations/20260618120000_add_calorie_goal_to_profiles.sql`) e o trigger
  `handle_new_user` já existente — nada a portar do lado do banco.

## Fora do escopo deste marco (propositalmente)

- Reeditar/recalcular o objetivo calórico depois de completar o onboarding — o web não tem essa
  tela em nenhum lugar além do `/setup` (nem em Configurações); fica de fora até (e se) aparecer no
  web primeiro.
- Qualquer tela do grafo autenticado além de decidir se o `NavHost` cai em `auth/setup` — Feed real
  (M3), Dieta (M4) etc. continuam placeholders do M0.
- Deep link ou qualquer outro ponto de entrada pra `auth/setup` além do gate de navegação — é
  sempre alcançado por decisão automática, nunca por link direto.

## Feito quando

- [ ] Logar (ou cadastrar+logar) com uma conta cujo `profiles.calorie_goal` ainda é `null` cai
      automaticamente em `SetupScreen`, não no Feed.
- [ ] O campo de usuário vem pré-preenchido com o username já existente (gerado no cadastro), e
      trocar por um nome em uso mostra o erro certo (tanto na checagem ao digitar quanto num
      `23505` de corrida no submit).
- [ ] A meta calórica exibida como preview bate com a fórmula do web para os mesmos valores de
      entrada (conferir manualmente com pelo menos 1 combinação homem e 1 mulher).
- [ ] Salvar grava `display_name`, `calorie_goal`, `goal_*` e `username` em `profiles` (conferir no
      Supabase Studio ou via novo login) e navega pro Feed sem permitir voltar pro formulário.
- [ ] Reabrir o app (cold start) com uma conta que já completou o onboarding vai direto pro Feed,
      não pede o formulário de novo.
- [ ] Uma conta que pula a `RequireEmailScreen` ("Continuar por agora", M1) mas ainda não tem
      `idrProfile` cai no `SetupScreen` em seguida, não direto no Feed.

## Notas para o próximo marco (M3)

- `GoalsRepository.getIdrProfile()` fica disponível pra qualquer tela que precise da meta calórica
  (ex.: resumo do dia na Dieta, M4) — não recriar essa busca em outro lugar.
- O padrão de `@Serializable data class` + Postgrest direto (não-RPC) estabelecido aqui é o que M3
  (feed) e M4 (dieta) devem seguir para suas próprias tabelas.
