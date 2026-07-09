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
| 6 | M7 restante - perfil, busca, configuracoes e seguranca | `specs/M7-perfil-busca-config.md` | Codex | `app/src/main/kotlin/com/lajesfit/android/feature/profile/*`, `app/src/main/kotlin/com/lajesfit/android/feature/settings/*`, `app/src/main/kotlin/com/lajesfit/android/feature/feed/FeedRepository.kt`, `app/src/main/kotlin/com/lajesfit/android/feature/feed/FeedScreen.kt`, `app/src/main/kotlin/com/lajesfit/android/feature/auth/AuthRepository.kt`, `app/src/main/kotlin/com/lajesfit/android/MainActivity.kt`, `app/src/main/kotlin/com/lajesfit/android/navigation/*`, `specs/COORDENACAO.md`, `specs/M7-perfil-busca-config.md` | em execução | Usuario liberou implementar todas as proximas sub-partes sem pedir aprovacao intermediaria; sub-partes 2 e 3 validadas com `:app:assembleDebug`, seguir para busca. |

## Próximo trabalho previsto (não iniciado — não começar sem o usuário liberar)

- **Verificação de M5 em device**: sync real do Health Connect nunca rodou num aparelho físico.
  Atenção: o device de dev atual (J7 Prime, Android 8.1) **não roda Health Connect** (exige
  Android 9+) — a sync real precisa de outro device ou emulador API 28+.
- **M7 — Perfil, busca e configuracoes** (`specs/M7-perfil-busca-config.md`): sub-parte 1
  concluida; proximo passo e sub-parte 2 (perfil read-only + posts), sem comecar sem nova
  liberacao do usuario.

## Histórico

| Data | Tarefa | Dono | Status | Notas |
|------|--------|------|--------|-------|
| 2026-07-09 | M6 sub-parte 1 - modelos, repository e ViewModel | Codex | concluída | Criados modelos, repository e ViewModel de desafios; build `:app:assembleDebug` confirmado com cache repo-local. Commit: `Implementa M6: base de desafios`. |
| 2026-07-09 | M6 sub-parte 2 - tela real de rankings | Codex | concluída | `ChallengesScreen.kt` substitui o placeholder por header, loading/erro, seis rankings, destaque do usuario atual e preview; `:app:assembleDebug`, `installDebug`, abertura do app e logcat sem crash confirmados. |
| 2026-07-09 | M7 sub-parte 1 - navegacao e chrome autenticado | Codex | concluída | Rotas `search`, `settings` e `profile/{username}` registradas; top bar autenticada com busca e avatar do usuario atual; placeholders dos destinos criados; `:app:assembleDebug`, `installDebug`, abertura do app e logcat sem crash confirmados. |
| 2026-07-09 | M7 sub-parte 2 - perfil read-only e posts | Codex | concluída | Perfil real por username, contadores, privacidade, posts do perfil e delete de post proprio; `:app:assembleDebug` passou. |
| 2026-07-09 | M7 sub-parte 3 - follow requests | Codex | concluída | Seguir, solicitar, cancelar, deixar de seguir, aceitar/recusar solicitacoes e atualizar contadores/status; `:app:assembleDebug` passou. |
| 2026-07-09 | Escrever spec do M6 - Desafios | Codex | concluída | Spec aprovada pelo usuário; próxima etapa é sub-parte 1 (modelos, repository e ViewModel). |
| 2026-07-09 | Somar calorias de treino do dia no resumo da Dieta (burned) | Codex | concluída | Failover por tokens do Claude; build `:app:assembleDebug` confirmado com cache repo-local. Commit: `Implementa M5: calorias de treino na dieta`. |
