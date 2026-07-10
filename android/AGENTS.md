# LajesFit Android — instruções para o Codex

Você é um **agente autônomo** no desenvolvimento do app Android nativo do LajesFit. O projeto pode
ser executado tanto pelo **Codex** quanto pelo **Claude Code**, com igualdade de autonomia: nenhum
dos dois é fiscalizador, líder fixo ou mero implementador por padrão. O agente que assume uma
tarefa aprovada passa a ser dono daquele escopo até concluir, entregar handoff ou registrar
bloqueio no quadro.

**Leia `CLAUDE.md` (mesma pasta) inteiro antes de qualquer coisa** — é a fonte da verdade sobre
arquitetura, marcos (M0-M8), o protocolo compartilhado entre agentes e o que NÃO portar do app
web. As decisões de arquitetura lá são fechadas (não redecida). Este arquivo complementa com:
regras específicas para o Codex, o estado atual do projeto, e coisas de ambiente/ferramenta já
descobertas na prática (evite redescobrir do zero).

## Trabalho em equipe — coordenação entre pares

O quadro compartilhado da equipe é `specs/COORDENACAO.md`. Estas regras existem para que Codex e
Claude possam trabalhar no mesmo checkout sem implementar coisas conflitantes:

1. **Uma tarefa por agente, com escopo de arquivos explícito.** Antes de editar uma tarefa de
   marco, registre ou atualize a linha dela no quadro com dono, spec/sub-parte e arquivos
   reservados. Se um briefing do usuário ou de outro agente listar arquivos permitidos, trate essa
   lista como contrato.
2. **Leia `specs/COORDENACAO.md` antes de editar qualquer arquivo.** Arquivo reservado a uma tarefa
   aberta de outro agente é intocável. Arquivos de integração sensíveis (`specs/*`,
   `../supabase/migrations/*`, `gradle/libs.versions.toml`, `app/build.gradle.kts`,
   `AndroidManifest.xml`, `navigation/*`) não pertencem a um modelo específico; pertencem ao agente
   que os reservar para a tarefa em andamento.
3. **Não duplique**: não implemente função/tela/rota que pertença a outra tarefa aberta no
   quadro, mesmo que "só pra ajudar" — é exatamente o conflito que este protocolo evita.
4. **Handoff obrigatório**: termine toda tarefa com uma mensagem final contendo o que foi feito,
   a lista exata de arquivos tocados, validações executadas, o que ficou de fora ou bloqueado, e o
   que precisa do usuário ou do outro agente. Atualize também o status/notas da sua tarefa em
   `specs/COORDENACAO.md` **e** `specs/DIARIO-DE-BORDO.md` (reescreva "Estado atual do repositório"
   + acrescente uma entrada no registro) — é o que a próxima sessão do outro agente lê primeiro.
5. **Permissões e ambiente**: cada agente usa os acessos disponíveis na própria sessão. Se algo
   bloquear (device/adb, escrita fora do workspace, daemon Gradle global), registre no handoff e
   peça ao usuário ou ao outro agente com acesso para executar. Build dentro do sandbox do Codex
   funciona com o cache repo-local (ver "Ambiente de build").
6. **Commits**: em modo direto ou em execução autônoma, o agente que conclui uma sub-parte aprovada
   pode buildar e commitar com mensagem curta em português, seguindo o padrão do `git log`, salvo
   se o usuário pedir explicitamente para não commitar.
7. **Failover simétrico**: se qualquer agente cair no meio de uma tarefa, o outro pode assumir.
   Antes de continuar, leia `specs/COORDENACAO.md`, `git status` e `git diff`, herde as reservas da
   tarefa aberta e continue do ponto real do diff — nunca recomece do zero nem reverta trabalho
   parcial sem pedido explícito do usuário.

## Processo — spec-driven development, com um gate de aprovação humana

O gate de aprovação é sempre humano. Codex e Claude podem escrever specs, revisar specs, implementar
e validar; nenhum dos dois substitui a aprovação do usuário antes de começar um marco novo.

1. Antes de escrever código de um marco (`M<n>`), confira se existe `specs/M<n>-<nome>.md`.
2. **Se não existir spec, escreva você mesmo primeiro** (baseada nos marcos M0-M8 descritos em
   `specs/PLANO.md` e no `CLAUDE.md`) — objetivo, comportamento do web a espelhar (leia o código
   real em `../src/features/*` e `../supabase/migrations/*.sql`, não invente schema), arquitetura
   no Android, o que fica fora do escopo, critério de "Feito quando".
3. **Depois de escrever a spec, PARE e peça revisão do usuário antes de implementar.** Não
   implemente na mesma sessão/turno em que a spec foi escrita, mesmo que pareça óbvio o que fazer.
   Esse é o gate de segurança do projeto — sem ele você pode implementar algo que o usuário não
   queria daquele jeito.
4. Uma vez a spec aprovada, implemente em sub-partes pequenas (a própria spec deve sugerir a
   divisão, em "Notas de execução" — se a spec de um marco grande não tiver isso, proponha a
   divisão antes de começar). Nunca implemente mais de um marco, ou mais de uma sub-parte de um
   marco grande, numa sessão só.
5. Termine cada sub-parte com o projeto num estado que compilaria (ver "Ambiente de build"
   abaixo pra verificar de verdade, não só supor) e **um commit pequeno**, a menos que o usuário
   peça para deixar sem commit. Mensagem de commit curta, em português, estilo dos commits já
   existentes (`git log` pra ver o padrão).
6. Pare aí. Não empilhe a próxima sub-parte "pra adiantar" — deixe o usuário decidir quando
   continuar.

## Ambiente de build (testado e funcionando)

- JDK: `C:\Program Files\Android\Android Studio\jbr` — defina `JAVA_HOME` pra esse caminho antes
  de rodar Gradle.
- SDK Android: `C:\Users\magno\AppData\Local\Android\Sdk` (já configurado em `local.properties`).
- Device físico costuma estar conectado via ADB quando o usuário quer ver o resultado
  (`adb devices` pra confirmar; era `SM-G610M`, serial `33003a50efc13415`, mas pode mudar).
- Build + install: `gradlew installDebug` (ou `gradlew.bat`) a partir de `android/`.
- Abrir o app: `adb shell am start -n com.lajesfit.android/.MainActivity`.
- Checar crash: `adb logcat -d | findstr /i "FATAL AndroidRuntime"` (ou `grep` equivalente) logo
  após abrir.

**Pegadinha de sandbox (se você estiver rodando em modo não-interativo/sandboxed, ex. `codex exec
-s workspace-write`)**: nessa máquina Windows, esse sandbox roda com um token restrito que não
consegue adquirir o lock do daemon do Gradle em `C:\Users\magno\.gradle\daemon\...`, mesmo
liberando a pasta com `--add-dir` — não é escopo de diretório, é token/ACL do Windows. **Solução
que funciona hoje**: usar o cache Gradle repo-local `.gradle-user-home/` (gitignored e já aquecido
por builds anteriores — não é mais o cache frio de 30+ min): defina `GRADLE_USER_HOME` para
`<raiz de android/>\.gradle-user-home` antes de rodar `gradlew.bat`. Instalação em device
(`installDebug`/adb) pode continuar fora do alcance do sandbox — peça ao usuário ou ao outro agente via
handoff.

## Erros de compilação já vistos neste projeto (não repetir)

- **Import ambíguo de `Preview`**: ao usar CameraX (`androidx.camera.core.Preview`) numa tela que
  também tem `@Preview` do Compose (`androidx.compose.ui.tooling.preview.Preview`), dê alias a um
  deles (`import androidx.camera.core.Preview as CameraPreview`) — os dois se chamam `Preview` e
  importar sem alias quebra a compilação inteira do arquivo com erros em cascata difíceis de ler.
- **`Int` vs `kotlin.time.Duration`**: APIs do supabase-kt (ex. signed URL do Storage) esperam
  `Duration`, não segundos como `Int` — `import kotlin.time.Duration.Companion.seconds` e
  `(segundos).seconds`.

## Estado atual do projeto

> **A foto viva do repositório (HEAD, working tree, o que o outro agente acabou de fazer) está em
> `specs/DIARIO-DE-BORDO.md` — leia-a primeiro.** O resumo abaixo é só o progresso de marcos
> (snapshot 2026-07-09) e pode estar defasado; o diário e o `git log` mandam.

- **M0-M4 commitados**: scaffolding, Supabase+Auth, Onboarding, Feed, Dieta completa (sub-partes
  1-4). Ver `git log` para os commits exatos.
- **M5 (Treinos, `specs/M5-treinos.md`) sub-partes 1-5 concluídas no Android**: histórico/totais do
  mês, treino manual com foto (criar/editar/excluir + sync do post), base Health Connect
  (dependência, manifest, rationale Activity, fluxo de permissão) e importação de sessões do
  Health Connect (leitura de `ExerciseSessionRecord` do mês atual, agregação de distância/calorias,
  upsert com dedupe por `(user_id, health_connect_record_id)`, criação/atualização de posts, botão
  "Sincronizar" na tela) e ligação com Dieta (calorias de treino do dia em `Queimado`/restante).
  Migration `../supabase/migrations/20260720120000_health_connect_workouts.sql` já criada.
  **Falta** validar a sincronização real do Health Connect em device/emulador Android 9+; o device
  de desenvolvimento testado roda Android 8.1 e só permite confirmar o estado "indisponível".

## Convenções de código já estabelecidas (espelhe, não reinvente)

- Repository: `@Singleton class ... @Inject constructor(private val supabaseClient: SupabaseClient)`,
  `data class ... Row` privadas `@Serializable` com `@SerialName` batendo colunas snake_case do
  banco. Ver `feature/feed/FeedRepository.kt`, `feature/diet/DietRepository.kt`.
- Tela: `UiState` data class, `@HiltViewModel`, `StateFlow`, `hiltViewModel()` na composable,
  `@Preview(showBackground = true)` obrigatório em toda tela nova. Ver `feature/feed/FeedScreen.kt`,
  `feature/diet/DietScreen.kt`.
- Navegação: tudo é destino do mesmo `NavHost` em `navigation/LajesFitNavGraph.kt`, rotas em
  `navigation/Destinations.kt`. Telas de formulário/"pop over" recebem resultado via
  `NavBackStackEntry.savedStateHandle`, não `Intent`/Activity separada (única exceção real:
  `HealthPermissionRationaleActivity` do M5, exigência da Play Store).
  - Sem comentários explicando o óbvio; só quando há uma razão não-óbvia — calibre olhando
  qualquer arquivo existente do projeto.
- Não adicione dependência nova em `gradle/libs.versions.toml`/`app/build.gradle.kts` a menos que
  a tarefa realmente precise; quando precisar, siga o estilo dos aliases já existentes.
- Pacote raiz `com.lajesfit.android` — não mude.

## Contexto de como este arquivo surgiu

Em 2026-07-09, uma sessão de Claude Code supervisionou parte do desenvolvimento do M4 delegando
implementação para o Codex via `codex exec`; depois houve trabalho direto do Codex com o usuário e
um período de coordenação hierárquica. O arranjo vigente agora é **autonomia simétrica**: Codex e
Claude podem planejar, implementar, validar e commitar sub-partes aprovadas, desde que reservem
escopo no quadro e respeitem o gate humano de spec.
