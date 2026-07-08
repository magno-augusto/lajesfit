# LajesFit Android (nativo) — guia para sessões de Claude Code

Este diretório é o app **nativo em Kotlin** do LajesFit — não confundir com `../android-twa/`
(TWA/Bubblewrap em Java, package `com.lajesfit.app`, ainda em produção e intocado). Este projeto
usa package `com.lajesfit.android` e roda lado a lado com a TWA até decisão de substituí-la.

Compartilha o **mesmo projeto Supabase** do app web em `../src/` — mesmo banco, mesmas RLS, mesmo
bucket `media`. Não é um backend novo: qualquer schema/RPC/tabela deve bater com
`../supabase/migrations/*.sql` e com o código real em `../src/features/*`, não ser reinventado.

## Antes de escrever código

1. Leia `specs/M<n>-*.md` do marco em andamento. Se não existir spec para o marco pedido,
   **escreva a spec primeiro** (baseada nos marcos M0–M8 abaixo) e espere revisão antes de
   implementar — spec-driven development: a spec é a fonte da verdade, não a conversa.
2. Rode `git status`/`git log -5` antes de assumir o que já foi feito — uma sessão anterior pode
   ter sido interrompida no meio de um marco.
3. Nunca tente implementar mais de um marco (ou mais de uma sub-parte de um marco grande, como
   M4/M7) numa única sessão. Termine com commits pequenos que deixem o projeto num estado que
   compilaria, e pare — não empilhe marcos "para adiantar".

## Decisões de arquitetura (fechadas — não redecidir)

- **Kotlin + Jetpack Compose (Material 3)**, Gradle single-module (`:app`). Sem multi-módulo a
  menos que o build ou a organização do time exijam.
- **Single-Activity**: `MainActivity` é a única Activity do app e hospeda um único `NavHost`
  (Navigation Compose) com **todos** os destinos — os 4 principais da bottom-nav (Feed, Dieta,
  Treinos, Desafio) *e* as telas de formulário/"pop over" (criar post, comentários, adicionar/
  editar refeição, scanner de código de barras, adicionar treino). Essas últimas **não** são
  Activities separadas — são destinos comuns do mesmo `NavHost`, navegados com
  `navController.navigate(route)`, com resultado devolvido via
  `NavBackStackEntry.savedStateHandle` (não `Intent`/`ActivityResultContracts`) e transição de
  entrada/saída deslizando de baixo para cima para preservar a sensação de modal do web.
  **Única exceção**: a `HealthPermissionRationaleActivity` (M5) é uma Activity de verdade porque a
  Play Store exige isso para permissões de saúde — não é uma escolha de navegação.
- **MVVM**: `ViewModel` + `StateFlow` por tela, `hiltViewModel()` escopado à entrada de navegação.
- **Otimizado para celular**: orientação retrato fixa (`android:screenOrientation="portrait"`),
  sem layout adaptativo para tablet/foldable nesta fase.
- **supabase-kt** (`io.github.jan-tennert.supabase`) para Auth/Postgrest/Storage/Realtime — mesmo
  projeto Supabase do web. **Ktor (engine OkHttp)** é o único stack de rede — não introduzir
  Retrofit.
- **Hilt** para DI (chega no marco M1, junto com o `SupabaseClient`) — ainda não usado no M0.
- **Coil** (imagens), **ML Kit Barcode Scanning + CameraX** (scanner, M4), **Firebase Cloud
  Messaging** (push, M8), **Health Connect** (`androidx.health.connect:connect-client`, M5 — não
  Strava; ver `specs/` do M5 para detalhes) e **DataStore** (sessão/estado leve).
- **Identidade visual**: `#E76F2E` (`LajesFitOrange`) / `#FFF8EC` (`LajesFitCream`), mesma
  identidade de `../public/manifest.webmanifest`. Ícone real ainda não gerado a partir de
  `../public/icon-512.png` — ver `specs/M0-scaffolding.md`.

## O que NÃO portar do web

Dois mecanismos do web existem só para compensar a falta de gerência de estado real e a morte de
processo do PWA — não replicar em Android:
- `../src/lib/session-draft.ts` (rascunhos de formulário em `sessionStorage`) — Android resolve com
  `ViewModel` + `SavedStateHandle`.
- `../src/features/fitness/change-event.ts` (evento global `CHANGE_EVENT`) — Android resolve com
  `StateFlow` real e, entre telas do `NavHost`, com `NavBackStackEntry.savedStateHandle`.

## Marcos (ver specs individuais em `specs/`)

M0 Scaffolding → M1 Supabase+Auth → M2 Onboarding → M3 Feed → M4 Dieta → M5 Treinos (Health
Connect) → M6 Desafios → M7 Perfil/busca/config → M8 Notificações (FCM). Cada marco tem (ou deve
ganhar, antes de começar) um `specs/M<n>-<nome>.md` com objetivo, arquivos tocados e critério de
"Feito quando".

## Verificação

Sessões de Claude Code rodando em ambiente sem Android SDK/Gradle/emulador **não conseguem
compilar nem rodar o app** — isso é esperado, não um bloqueio a resolver. Verificar o que dá:
consistência de package ID entre `app/build.gradle.kts`/`AndroidManifest.xml`/pacotes Kotlin, e
nomes de RPCs/tabelas batendo com `../supabase/migrations/*.sql`. Toda tela Compose deve ter um
`@Preview(showBackground = true)` para poder ser inspecionada no Android Studio sem build/emulador.
A compilação real, o lint e a execução em emulador/device ficam para quem abrir `android/` no
Android Studio.
