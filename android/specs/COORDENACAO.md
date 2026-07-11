# Quadro de coordenação — Claude Code + Codex

Fonte da verdade sobre **quem está mexendo em quê** neste checkout. O protocolo completo está em
`../CLAUDE.md` (seção "Equipe de agentes") e `../AGENTS.md` (seção "Trabalho em equipe").

> **Modo ativo desde 2026-07-09: autonomia simétrica.** Codex e Claude podem planejar,
> implementar, validar e commitar sub-partes aprovadas. Não há líder/fiscalizador fixo por modelo:
> o dono da tarefa é quem reserva escopo no quadro e responde pelo handoff daquela tarefa.

Regras de uso:

1. **Antes de editar qualquer arquivo do app**, leia as tarefas abertas abaixo — arquivo
   reservado a uma tarefa aberta do outro agente é intocável.
2. Toda tarefa de marco, correção com risco de conflito ou trabalho em paralelo ganha uma linha
   aqui **antes** da edição, seja ela assumida por Claude ou Codex.
3. Status sugeridos: `planejada` → `em execução` → `em validação` → `concluída`, ou `bloqueada`
   quando depender de ação externa. Bloqueios são anotados na coluna Notas.
4. Cada agente edita este arquivo para registrar/atualizar as tarefas que assume. Para assumir uma
   tarefa aberta do outro agente, anote a troca de dono na própria linha antes de continuar.
5. **Failover**: se os tokens de um agente acabarem no meio de uma tarefa, o outro assume a
   tarefa aberta — herda as reservas de arquivos dela, lê `git status`/`git diff` + o
   briefing/handoff, continua do ponto onde parou (nunca recomeça do zero) e anota a troca de
   dono na linha da tarefa.

## Arquivos de integração sensíveis

Não há reserva padrão por modelo. Os arquivos abaixo exigem reserva explícita na tarefa antes de
editar, porque concentram integração e geram conflito com facilidade:

- `specs/*` (incluindo este quadro)
- `../supabase/migrations/*`
- `gradle/libs.versions.toml`
- `app/build.gradle.kts`
- `app/src/main/AndroidManifest.xml`
- `app/src/main/kotlin/com/lajesfit/android/navigation/*`

## Tarefas abertas

| # | Tarefa | Spec | Dono | Arquivos reservados | Status | Notas |
|---|--------|------|------|---------------------|--------|-------|
| 7 | Polimento visual global do app Android | pedido direto do usuario | Claude (assumiu de Codex em 2026-07-09) | `app/src/main/kotlin/com/lajesfit/android/ui/theme/*`, `app/src/main/res/font/*`, `app/src/main/kotlin/com/lajesfit/android/MainActivity.kt`, `app/src/main/kotlin/com/lajesfit/android/ui/components/*`, `app/src/main/kotlin/com/lajesfit/android/feature/auth/*`, `app/src/main/kotlin/com/lajesfit/android/feature/feed/*`, `app/src/main/kotlin/com/lajesfit/android/feature/diet/*`, `app/src/main/kotlin/com/lajesfit/android/feature/workouts/*`, `app/src/main/kotlin/com/lajesfit/android/feature/challenges/*`, `app/src/main/kotlin/com/lajesfit/android/feature/profile/*`, `app/src/main/kotlin/com/lajesfit/android/feature/settings/*`, `specs/COORDENACAO.md` | em validação | Iteração 2026-07-10 (Claude): redesign do tema para **fidelidade ao design system do web** (`../src/styles.css`). Paleta reescrita a partir dos tokens oklch — fundo quase-branco + cards brancos, secundaria marrom-ambar e terciaria clay no lugar do verde/azul (verde só em success); cantos mais arredondados (medium 8→16dp); fonte Bebas Neue (OFL) em `res/font` aplicada aos estilos display (marca na top bar + telas de auth). Só camada de tema + 6 wordmarks; telas herdam via `MaterialTheme`. `:app:assembleDebug` OK, instalado e **verificado por screenshot no device** (Feed + Desafio: marca em Bebas, cards brancos arredondados, paleta laranja/marrom sem verde/azul). Pendente: conferir demais telas (Dieta/Treinos/Perfil/Login) e ajuste fino de raio dos botoes (Material mantem pilula por padrao). Contexto anterior: commits `e495726`/`cf8823d`. |

## Próximo trabalho previsto (não iniciado — não começar sem o usuário liberar)

- **Verificação de M5 em device**: sync real do Health Connect nunca rodou num aparelho físico.
  Atenção: o device de dev atual (J7 Prime, Android 8.1) **não roda Health Connect** (exige
  Android 9+) — a sync real precisa de outro device ou emulador API 28+.
- **M8 - Notificacoes + FCM**: escrever `specs/M8-notificacoes-fcm.md` e aguardar aprovacao do
  usuario antes de implementar, conforme gate de spec-driven development.
- **Integrar Gradle Play Publisher (pós-primeiro-publish)**: automatizar upload/promoção do AAB via
  Google Play Android Developer API a partir do Gradle (`./gradlew publishReleaseBundle`), lendo o
  `versionCode` atual das trilhas em vez de conferir à mão. Só faz sentido **depois** do primeiro
  publish manual — os formulários de Data safety / Health Connect são console-only. Exige conta de
  serviço no Google Cloud + acesso de API no Play Console (credencial/segredo, ação do usuário).

## Histórico

| Data | Tarefa | Dono | Status | Notas |
|------|--------|------|--------|-------|
| 2026-07-11 | Primeiro publish na Play (teste interno) via Console | Claude + usuario | concluída | AAB v2 (`com.lajesfit.app`, `versionCode 2`) subido ao teste interno; declaracao de ID de publicidade = "Nao" (sem `AD_ID` no manifest merged); Data safety + Apps de saude (herdados da TWA) revisados e corretos para o nativo; usuario clicou "Salvar e publicar". v2 "Disponivel para testadores internos", takeover efetivado. Detalhes em `specs/PLAY-STORE-PREP.md` e `DIARIO-DE-BORDO.md`. Pendente (usuario/device): promover a producao, testar em device Android 8.0+, validar Health Connect em Android 9+. |
| 2026-07-11 | Publicacao Play: alias Health Connect (Android 14+) + gerar AAB | Claude | concluída | Adicionado `activity-alias` `ViewPermissionUsageActivity` (`VIEW_PERMISSION_USAGE`/`HEALTH_PERMISSIONS`, protegido por `START_VIEW_PERMISSION_USAGE`, `targetActivity` = `HealthPermissionRationaleActivity`) ao manifest — fecha o gap Android 14+ do checklist HC. Gerado `:app:bundleRelease` com JBR do Android Studio + cache repo-local: `BUILD SUCCESSFUL`, AAB em `app/build/outputs/bundle/release/app-release.aab` (29 MB, `versionCode 2`). Assinatura conferida: SHA-256 do AAB == SHA-256 da keystore de upload (`0A:86:47:...:97:D0:6C`, alias `lajesfit`). Pendencias externas (usuario/console): deploy web `/privacidade`, aplicar 2 migrations, upload do AAB + formularios Data safety/Health Connect. |
| 2026-07-10 | Verificacao do takeover da ficha da Play + `build.gradle.kts` | Claude | concluída | Conferido no Play Console (via extensao Chrome) que `com.lajesfit.app` esta so no teste interno — bundle unico `versionCode 1`, producao inativa, 0 instalacoes — e que a upload key e a mesma keystore da TWA (`android-twa/android.keystore`, alias `lajesfit`, SHA-256 `0A:86:47:...:06`). Commitado `app/build.gradle.kts` (applicationId `com.lajesfit.app`, `versionCode 2`, signingConfig release). Commit `c86a10c`. Pendente (usuario/console): primeiro publish manual + formularios Data safety/Health Connect. |
| 2026-07-10 | Preparo de publicacao na Play | Codex | concluida | Politica publica `/privacidade` atualizada para cobrir Android nativo + web/PWA, Health Connect e Strava somente no web; criado `android/specs/PLAY-STORE-PREP.md` com inventario de Data safety, texto-base de Health Connect e pendencias de Play Console/app build. `tsc --noEmit --project ../tsconfig.json` passou. Fora do escopo: `android/app/**`, Play Console, deploy web e migrations Supabase. |
| 2026-07-09 | M6 sub-parte 1 - modelos, repository e ViewModel | Codex | concluída | Criados modelos, repository e ViewModel de desafios; build `:app:assembleDebug` confirmado com cache repo-local. Commit: `Implementa M6: base de desafios`. |
| 2026-07-09 | M6 sub-parte 2 - tela real de rankings | Codex | concluída | `ChallengesScreen.kt` substitui o placeholder por header, loading/erro, seis rankings, destaque do usuario atual e preview; `:app:assembleDebug`, `installDebug`, abertura do app e logcat sem crash confirmados. |
| 2026-07-09 | M7 sub-parte 1 - navegacao e chrome autenticado | Codex | concluída | Rotas `search`, `settings` e `profile/{username}` registradas; top bar autenticada com busca e avatar do usuario atual; placeholders dos destinos criados; `:app:assembleDebug`, `installDebug`, abertura do app e logcat sem crash confirmados. |
| 2026-07-09 | M7 sub-parte 2 - perfil read-only e posts | Codex | concluída | Perfil real por username, contadores, privacidade, posts do perfil e delete de post proprio; `:app:assembleDebug` passou. |
| 2026-07-09 | M7 sub-parte 3 - follow requests | Codex | concluída | Seguir, solicitar, cancelar, deixar de seguir, aceitar/recusar solicitacoes e atualizar contadores/status; `:app:assembleDebug` passou. |
| 2026-07-09 | M7 sub-parte 4 - busca de pessoas | Codex | concluída | Busca real com sanitizacao, debounce de 300 ms, limite 20, estados de loading/vazio/erro e navegacao para perfil; `:app:assembleDebug` passou. |
| 2026-07-09 | M7 sub-parte 5 - configuracoes de perfil | Codex | concluída | Settings reais para nome, bio, avatar via Photo Picker/Storage signed URL e privacidade; `:app:assembleDebug` passou. |
| 2026-07-09 | M7 sub-parte 6 - seguranca e preferencias | Codex | concluída | Preferencias de notificacao por tipo, troca/definicao de senha, atualizacao de e-mail real e logout; `:app:assembleDebug` passou. Commit: `Implementa M7: seguranca e preferencias`. |
| 2026-07-09 | Escrever spec do M6 - Desafios | Codex | concluída | Spec aprovada pelo usuário; próxima etapa é sub-parte 1 (modelos, repository e ViewModel). |
| 2026-07-09 | Somar calorias de treino do dia no resumo da Dieta (burned) | Codex | concluída | Failover por tokens do Claude; build `:app:assembleDebug` confirmado com cache repo-local. Commit: `Implementa M5: calorias de treino na dieta`. |
