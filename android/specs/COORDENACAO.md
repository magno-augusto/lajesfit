# Quadro de coordenação — equipe Claude Code (líder) + Codex (implementador)

Fonte da verdade sobre **quem está mexendo em quê** neste checkout. O protocolo completo está em
`../CLAUDE.md` (seção "Equipe de agentes") e `../AGENTS.md` (seção "Trabalho em equipe").

> **Modo ativo desde 2026-07-09: economia de tokens do Claude.** O Codex é o executor principal
> (implementa, builda, commita, atualiza quadro/specs); o Claude só delega com briefings mínimos e
> destrava o que o sandbox bloqueia (device/adb, escrita fora do workspace). Sem revisão do Claude
> até os tokens renovarem.

Regras de uso:

1. **Antes de editar qualquer arquivo do app**, leia as tarefas abertas abaixo — arquivo
   reservado a uma tarefa aberta do outro agente é intocável.
2. Toda delegação ao Codex ganha uma linha aqui **antes** do `codex exec` (quem escreve é o
   Claude).
3. Status: `delegada` → `em execução` → `em revisão` (Codex terminou; Claude revisa/builda) →
   `concluída` (linha movida para o Histórico). Bloqueios são anotados na coluna Notas.
4. O Codex só edita este arquivo para atualizar status/notas da **própria** tarefa.
5. **Failover**: se os tokens de um agente acabarem no meio de uma tarefa, o outro assume a
   tarefa aberta — herda as reservas de arquivos dela, lê `git status`/`git diff` + o
   briefing/handoff, continua do ponto onde parou (nunca recomeça do zero) e anota a troca de
   dono na linha da tarefa.

## Reservas padrão (valem mesmo sem tarefa aberta)

- **Claude**: `specs/*` (incluindo este quadro), `../supabase/migrations/*`,
  `gradle/libs.versions.toml`, `app/build.gradle.kts`, `app/src/main/AndroidManifest.xml`,
  `app/src/main/kotlin/com/lajesfit/android/navigation/*`.
- Um briefing pode ceder um item acima ao Codex numa tarefa específica — a cessão fica registrada
  na coluna "Arquivos reservados" da tarefa.

## Tarefas abertas

| # | Tarefa | Spec | Dono | Arquivos reservados | Status | Notas |
|---|--------|------|------|---------------------|--------|-------|

## Próximo trabalho previsto (não iniciado — não começar sem o usuário liberar)

- **Verificação de M5 em device**: sync real do Health Connect nunca rodou num aparelho físico.
  Atenção: o device de dev atual (J7 Prime, Android 8.1) **não roda Health Connect** (exige
  Android 9+) — a sync real precisa de outro device ou emulador API 28+.
- **M6 — Desafios** (`specs/PLANO.md`): próximo marco após fechar M5; exige spec nova aprovada
  antes de qualquer código.

## Histórico

| Data | Tarefa | Dono | Status | Notas |
|------|--------|------|--------|-------|
| 2026-07-09 | Somar calorias de treino do dia no resumo da Dieta (burned) | Codex | concluída | Failover por tokens do Claude; build `:app:assembleDebug` confirmado com cache repo-local. Commit: `Implementa M5: calorias de treino na dieta`. |
