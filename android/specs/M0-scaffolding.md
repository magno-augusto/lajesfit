# M0 — Scaffolding e branding

Status: **implementado e verificado** (branch `android-native-m0-scaffolding`, mergeada em `main`).

## Objetivo

Criar o projeto Gradle/Android vazio com o package ID definitivo, tema/cores da marca, e o
`NavHost` único (single-Activity) com os 4 destinos principais + as 3 rotas "pop over" do FAB
central, todos como telas placeholder — sem nenhuma lógica de negócio ainda. Isso dá a todos os
marcos seguintes uma base que já compila (quando aberta no Android Studio) e uma navegação
completa para preencher, em vez de ter que desenhar o grafo de novo a cada marco.

## Arquivos criados

- `settings.gradle.kts`, `build.gradle.kts`, `gradle/libs.versions.toml`, `gradle.properties`,
  `app/build.gradle.kts` — `applicationId`/`namespace` = `com.lajesfit.android`, `minSdk 26`
  (exigência do Health Connect no M5), `compileSdk`/`targetSdk 35`, Compose habilitado via plugin
  `org.jetbrains.kotlin.plugin.compose` (Kotlin 2.0, sem `kotlinCompilerExtensionVersion`).
- `app/src/main/AndroidManifest.xml` — `MainActivity` como única activity, `screenOrientation="portrait"`.
- `app/src/main/res/{values,drawable,mipmap-anydpi-v26}/*` — `strings.xml`, `colors.xml`,
  `themes.xml` (tema de janela mínimo; cores reais vivem no Compose), ícone adaptativo **placeholder**
  (vetor branco simples sobre `#E76F2E`).
- `app/src/main/kotlin/com/lajesfit/android/`:
  - `LajesFitApp.kt` (Application vazio; `@HiltAndroidApp` chega no M1).
  - `MainActivity.kt` — única Activity, `Scaffold` com `NavigationBar` (Feed/Dieta/Treinos/Desafio)
    + FAB central com dropdown (Post/Refeição/Treino) navegando para as rotas "pop over".
  - `navigation/Destinations.kt` — `BottomNavDestination` enum + `PopOverRoutes` object.
  - `navigation/LajesFitNavGraph.kt` — `NavHost` com os 7 destinos (4 abas + 3 pop-over).
  - `ui/theme/{Color,Type,Theme}.kt` — `LajesFitOrange`/`LajesFitCream` + `LajesFitTheme`.
  - `ui/components/PlaceholderScreen.kt` — esqueleto compartilhado por todas as telas ainda sem
    conteúdo (abas mostram só o título; pop-overs ganham barra com botão fechar).
  - `feature/{feed,diet,workouts,challenges}/*Screen.kt` — 7 telas placeholder (`FeedScreen`,
    `DietScreen`, `WorkoutsScreen`, `ChallengesScreen`, `CreatePostScreen`, `AddEditMealScreen`,
    `AddWorkoutScreen`), cada uma só com `PlaceholderScreen(title = ...)`.
- `.gitignore` — `build/`, `.gradle/`, `local.properties`, `.idea/`, e `app/google-services.json`
  (nunca versionar; vem do Firebase Console no M8).

## Fora do escopo deste marco (propositalmente)

- Hilt/DI (M1), supabase-kt (M1), qualquer chamada de rede ou ao Supabase.
- Conteúdo real de qualquer tela — todas são placeholder.
- Ícone de launcher definitivo: o vetor atual é um placeholder de marca (cor certa, forma
  genérica). O ícone real precisa ser gerado a partir de `../public/icon-512.png` via *Image Asset
  Studio* no Android Studio — não há ferramenta de imagem disponível em sessão de Claude Code sem
  acesso a um ambiente com essas ferramentas para rasterizar/vetorizar o PNG.
- Gradle wrapper (`gradlew`/`gradlew.bat`/`gradle-wrapper.jar`): não incluído porque o `.jar` é um
  binário que exige Gradle instalado para gerar (`gradle wrapper`) — o Android Studio cria isso
  automaticamente na primeira sincronização de um projeto Gradle sem wrapper.

## Feito quando

- [x] Estrutura de arquivos criada e revisada (este commit).
- [x] **Verificado pelo usuário** em Android Studio local: projeto sincroniza sem erro, app builda
      e abre no emulador/device mostrando as 4 abas vazias com bottom-nav e FAB, cores da marca
      aplicadas; tocar no FAB abre o menu com as 3 ações e cada uma navega para a tela "pop over"
      correspondente (com botão de fechar funcionando); alternar entre as 4 abas preserva estado de
      scroll/posição (comportamento padrão do `NavigationBar` + `saveState`/`restoreState`).

## Notas para o próximo marco (M1)

- Adicionar Hilt (plugin Gradle + KSP) e `@HiltAndroidApp` em `LajesFitApp.kt`,
  `@AndroidEntryPoint` em `MainActivity.kt`.
- Adicionar supabase-kt + Ktor/OkHttp às dependências do `app/build.gradle.kts`.
- Criar `specs/M1-supabase-auth.md` antes de começar a implementar.
