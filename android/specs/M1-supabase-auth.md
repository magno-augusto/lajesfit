# M1 — Supabase + Auth

Status: **implementado nesta sessão, pendente de build/teste real em Android Studio** (sessão sem
Android SDK/Gradle — ver `CLAUDE.md` "Verificação"). Login com Google implementado de ponta a ponta
no código, mas o botão só funciona de fato depois que `GOOGLE_WEB_CLIENT_ID` for preenchido em
`local.properties` (pré-requisito externo, não bloqueia o resto do marco).

## Objetivo

Ligar o app ao mesmo projeto Supabase do web (`../src/integrations/supabase/client.ts`), com Hilt
provendo um `SupabaseClient` singleton, e construir as telas de autenticação (login, cadastro,
Google, esqueci-a-senha, exigir-e-mail para contas legadas) espelhando exatamente as regras já
implementadas em `../src/features/auth/auth.ts` — não reinventar validação, mensagens de erro nem
RPCs. Sessão persistida via DataStore, sobrevivendo a restart do processo.

## Comportamento do web a espelhar (fonte da verdade)

Tudo abaixo é o comportamento **real hoje**, lido em `src/features/auth/auth.ts` e
`src/components/app-shell.tsx`:

- **Login por usuário ou e-mail** (`loginWithPassword`, `auth.ts:59-81`): se o identificador digitado
  bate com regex de e-mail, usa direto; senão normaliza como username (`normalizeUsername`:
  trim + lowercase + strip de tudo que não for `[a-z0-9_]`) e resolve o e-mail via RPC
  `get_login_email(p_username)` (`auth.ts:73`). RPC falhando ou vazia → erro genérico "Usuario ou
  senha incorretos" (não vazar se o usuário existe). Login em si via
  `auth.signInWithPassword(email, password)`.
- **Cadastro** (`signUpWithPassword`, `auth.ts:27-56`): valida username normalizado não-vazio,
  e-mail com regex simples, senha ≥ 6 caracteres; `auth.signUp(email, password)` com
  `data.username`/`data.display_name` = username normalizado nos metadados do usuário; **desloga
  logo em seguida** (`auth.signOut()`) — o cadastro não loga automaticamente, força o usuário a
  entrar explicitamente depois (retrata isso na UI: sucesso → volta para tela de login, não para o
  feed).
- **Esqueci minha senha** (`requestPasswordReset`, `auth.ts:88-106`): pede só o **username** (não
  e-mail, pois contas legadas usam e-mail sintético — ver abaixo), resolve e-mail real via
  `get_login_email` e chama `auth.resetPasswordForEmail(email, { redirectTo })`. No Android,
  `redirectTo` não pode ser uma URL http do site — precisa ser um **deep link do app** (ver seção
  dedicada) para que o link do e-mail abra o app numa tela de "definir nova senha"
  (`confirmNewPassword`, `auth.ts:110-116`: `auth.updateUser({ password })`, exige que a sessão de
  recovery já tenha sido estabelecida pelo deep link).
- **Login com Google** (`loginWithGoogle`, `auth.ts:122-133`): no web é
  `auth.signInWithOAuth({ provider: "google", redirectTo })` (fluxo de redirect de navegador). No
  Android o equivalente idiomático é **não** abrir um Custom Tab de OAuth, e sim o fluxo nativo:
  Credential Manager (`androidx.credentials`) obtém um Google ID Token e o app chama
  `auth.signInWith(IDToken)` do supabase-kt com esse token — mesmo provedor Google configurado no
  mesmo projeto Supabase, sem endpoint novo. **Ver pré-requisito externo abaixo — bloqueia só este
  botão, não o resto do marco.**
- **Contas legadas sem e-mail real** (`LEGACY_EMAIL_DOMAIN = "@lajesfit.local"`, `auth.ts:7`;
  gate em `app-shell.tsx:91-92,144,146`): se `user.email` termina em `@lajesfit.local` e não há
  `user.new_email` pendente, o web força a rota `/require-email` antes de liberar qualquer outra
  tela (inclusive antes do onboarding). A tela (`src/features/auth/RequireEmail.tsx`) pede um
  e-mail real, chama `auth.updateUser({ email }, { emailRedirectTo })` (troca de e-mail, não
  cadastro novo) e **permite pular** ("Continuar por agora") sem bloquear definitivamente — não é
  um gate destrutivo, é um lembrete que reaparece enquanto o e-mail continuar sintético.
- **Troca de senha logada** (`changePassword`, `auth.ts:156-171`) e **detecção de login-só-Google**
  (`hasPasswordLogin`, `auth.ts:142-145`, via `user.app_metadata.providers.includes("email")`) são
  usados nas Configurações do web — **ficam fora deste marco** (entram no M7, que é onde
  Configurações nasce no Android), mas o modelo de sessão/usuário criado aqui precisa expor
  `app_metadata.providers` para não ter que re-buscar isso depois.

## Arquitetura no Android

- **`core/di/SupabaseModule.kt`** (Hilt, `@Provides @Singleton`): cria o `SupabaseClient` com
  `Auth`, `Postgrest` (mesma URL/anon key do projeto — mesmas de `../src/integrations/supabase/client.ts`,
  vêm de `local.properties`/`BuildConfig`, nunca hardcoded no repo) e engine Ktor `OkHttp`.
- **Sessão em DataStore, não no `SessionManager` default do supabase-kt**: implementar
  `SessionManager` customizado (interface do plugin `Auth` do supabase-kt) que lê/grava a sessão
  serializada num `Preferences DataStore` (`core/data/AuthSessionStore.kt`) — decisão já fixada em
  `CLAUDE.md` ("DataStore para sessão/estado leve"), em vez do backing padrão em
  `SharedPreferences` que a lib usa se nada for passado.
- **`core/di/HiltModules`**: `@HiltAndroidApp` em `LajesFitApp.kt` (hoje vazio, comentário dizia
  "chega no M1" — `specs/M0-scaffolding.md:24`), `@AndroidEntryPoint` em `MainActivity.kt`.
- **`feature/auth/`** (pasta nova, mesma convenção das demais features):
  - `AuthRepository.kt` — porta 1:1 as funções de `auth.ts` para Kotlin: `normalizeUsername`,
    `signUp`, `login` (com a mesma resolução usuário-vs-e-mail + RPC `get_login_email`),
    `requestPasswordReset`, `confirmNewPassword`, `loginWithGoogleIdToken`, `logout`,
    `observeSession(): StateFlow<UserSession?>`.
  - `LoginScreen.kt` + `LoginViewModel.kt` — campo único usuário-ou-e-mail + senha, botão "Entrar
    com Google", link para cadastro e para "esqueci minha senha".
  - `SignUpScreen.kt` + `SignUpViewModel.kt` — usuário + e-mail + senha; sucesso volta para
    `LoginScreen` (não navega para dentro do app), replicando o `signOut()` pós-cadastro do web.
  - `ForgotPasswordScreen.kt` — pede username, chama `requestPasswordReset`, mostra confirmação de
    e-mail enviado (mesmo texto de intenção do web).
  - `ResetPasswordScreen.kt` — destino alvo do deep link de recovery; campo de nova senha, chama
    `confirmNewPassword`.
  - `RequireEmailScreen.kt` — espelha `RequireEmail.tsx`: campo de e-mail, `updateUser({ email })`,
    botão "Continuar por agora" que só avança (não bloqueia).
- **Estes destinos são novos no `NavHost`** (`navigation/LajesFitNavGraph.kt`), fora do padrão
  "pop over" do M0 — são o **grafo raiz não-autenticado**: `MainActivity` decide, a partir do
  `StateFlow<UserSession?>` do `AuthRepository`, se o `NavHost` começa em `auth/login` ou no grafo
  principal (Feed/Dieta/Treinos/Desafio) já existente do M0. Sem sessão → só os destinos de auth
  visíveis; com sessão mas `needsRealEmail` → força `require-email` (mesma lógica do
  `app-shell.tsx:91-92`, reavaliada a cada mudança de sessão/usuário, não com gate destrutivo).
- **Deep link de recovery de senha** (`AndroidManifest.xml`): custom scheme `lajesfit://auth`
  (decidido — supabase-kt's `AuthConfig.scheme`/`host` comparam só esquema+host, não path, então um
  único deep link serve para recovery/signup-confirm/magic-link; o tipo de fluxo vem em
  `UserSession.type`, não na URL). `MainActivity.handleAuthDeepLink` chama
  `supabaseClient.handleDeeplinks(intent) { session -> if (session.type == "recovery") ... }` e força
  `ResetPasswordScreen` só para o caso de recovery. App Link verificado por domínio fica de fora
  desta fase (ver "Fora do escopo").

## Pré-requisito manual e externo (só para o botão Google, não bloqueia o resto do M1)

Igual ao padrão já registrado em `specs/PLANO.md` para o Firebase Console (M8): o Credential
Manager exige um **OAuth Client ID do Google Cloud Console tipo "Android"** registrado com
`applicationId` (`com.lajesfit.android`) + SHA-1 do keystore de debug/release, **no mesmo projeto
GCP** já usado pelo provedor Google do Supabase Auth do web. Sem isso, o botão "Entrar com Google"
não pode ser implementado de verdade — o resto do marco (login/cadastro por senha, esqueci-senha,
require-email, sessão em DataStore) não depende disso e pode ser implementado e testado primeiro.

## Fora do escopo deste marco (propositalmente)

- Onboarding/IDR (`/setup` equivalente) — M2. Este marco só precisa expor o `StateFlow<UserSession?>`
  que o M2 vai consumir para decidir o próximo redirecionamento.
- Troca de senha logada e detecção de login-só-Google na UI de Configurações — M7 (mas o repositório
  já expõe `app_metadata.providers`, ver acima).
- Qualquer tela dentro do grafo autenticado (Feed/Dieta/Treinos/Desafio) além de decidir se o
  `NavHost` começa autenticado ou não.
- App Links verificados por domínio para o deep link de recovery (fica com custom scheme por ora).

## Feito quando

Código escrito e revisado nesta sessão (grounding verificado contra o código-fonte real do
supabase-kt 3.6.0 e do androidx.credentials via GitHub, já que não há SDK/Gradle nesta sessão para
compilar — ver `CLAUDE.md`). Falta o usuário abrir em Android Studio, preencher
`SUPABASE_ANON_KEY` em `local.properties` e testar de ponta a ponta:

- [ ] `SupabaseClient` injetado via Hilt, sessão persistida em DataStore e restaurada no cold start
      (matando o processo e reabrindo o app, a sessão continua logada).
- [ ] Criar conta com usuário+e-mail+senha grava no Supabase (`auth.signUp`) e volta para a tela de
      login (não loga automaticamente), igual ao web.
- [ ] Logar com **usuário** e logar com **e-mail** (mesma senha) ambos funcionam contra o Supabase
      real, incluindo a resolução via RPC `get_login_email`.
- [ ] Esqueci-a-senha: pedir por username envia e-mail de recovery real; tocar no link (deep link
      custom scheme) abre `ResetPasswordScreen` com sessão de recovery válida; definir nova senha
      funciona e permite logar com ela em seguida.
- [ ] Conta legada com e-mail `@lajesfit.local` é redirecionada para `RequireEmailScreen` ao logar;
      cadastrar e-mail real dispara o e-mail de confirmação; "Continuar por agora" não trava a
      navegação.
- [ ] (Se o pré-requisito do Google Cloud Console já estiver disponível) Logar com Google via
      Credential Manager funciona de ponta a ponta contra o Supabase real. Caso contrário, este item
      fica documentado como pendente e o marco é considerado feito sem ele.

## Notas para o próximo marco (M2)

- Consumir `AuthRepository.observeSession()` para decidir se o usuário precisa passar pelo
  onboarding (`idrProfile == null`, mesma checagem de `app-shell.tsx:100` via `useFitness()`) antes
  de liberar o grafo principal.
- Criar `specs/M2-onboarding.md` antes de começar a implementar.
