# LajesFit Android — instruções para o Codex

Você é o agente responsável pelo desenvolvimento contínuo do app Android nativo do LajesFit,
trabalhando diretamente com o usuário (não orquestrado por outra IA). Este arquivo existe pra você
conseguir operar com autonomia entre sessões, sem precisar reconstruir contexto do zero a cada vez.

**Leia `CLAUDE.md` (mesma pasta) inteiro antes de qualquer coisa** — é a fonte da verdade sobre
arquitetura, marcos (M0-M8) e o que NÃO portar do app web. As decisões de arquitetura lá são
fechadas (não redecida). Este arquivo complementa com: o processo que você deve seguir sozinho, o
estado atual do projeto, e coisas específicas de ambiente/ferramenta que já foram descobertas na
prática (evite redescobrir do zero).

## Processo — spec-driven development, com um gate de aprovação humana

O `CLAUDE.md` já estabelece isso, mas é o ponto mais importante pra você operando sem supervisão
constante, então repetindo com ênfase:

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
   abaixo pra verificar de verdade, não só supor) e **um commit pequeno** — é assim que o
   `CLAUDE.md` pede pra fechar cada etapa. Mensagem de commit curta, em português, estilo dos
   commits já existentes (`git log` pra ver o padrão).
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
liberando a pasta com `--add-dir` — não é escopo de diretório, é token/ACL do Windows. Se isso
acontecer, não fique tentando workarounds em loop (redirecionar `GRADLE_USER_HOME` funciona mas
força um cache frio, 30+ min). Se estiver rodando interativo com o usuário presente, é mais simples
pedir pra ele rodar o build (ou aprovar acesso irrestrito pra esse comando específico) do que brigar
com o sandbox.

## Erros de compilação já vistos neste projeto (não repetir)

- **Import ambíguo de `Preview`**: ao usar CameraX (`androidx.camera.core.Preview`) numa tela que
  também tem `@Preview` do Compose (`androidx.compose.ui.tooling.preview.Preview`), dê alias a um
  deles (`import androidx.camera.core.Preview as CameraPreview`) — os dois se chamam `Preview` e
  importar sem alias quebra a compilação inteira do arquivo com erros em cascata difíceis de ler.
- **`Int` vs `kotlin.time.Duration`**: APIs do supabase-kt (ex. signed URL do Storage) esperam
  `Duration`, não segundos como `Int` — `import kotlin.time.Duration.Companion.seconds` e
  `(segundos).seconds`.

## Estado atual do projeto (snapshot em 2026-07-09, atualizado por uma sessão de Claude Code —
confira `git log`/`git status` pra atualizar)

- **M0-M4 commitados**: scaffolding, Supabase+Auth, Onboarding, Feed, Dieta completa (sub-partes
  1-4). Ver `git log` para os commits exatos.
- **M5 (Treinos, `specs/M5-treinos.md`) sub-partes 1-4 concluídas no Android**: histórico/totais do
  mês, treino manual com foto (criar/editar/excluir + sync do post), base Health Connect
  (dependência, manifest, rationale Activity, fluxo de permissão) e importação de sessões do
  Health Connect (leitura de `ExerciseSessionRecord` do mês atual, agregação de distância/calorias,
  upsert com dedupe por `(user_id, health_connect_record_id)`, criação/atualização de posts, botão
  "Sincronizar" na tela). Migration
  `../supabase/migrations/20260720120000_health_connect_workouts.sql` já criada (Claude Code tem
  acesso de escrita em `../supabase`, ao contrário do sandbox do Codex — não é mais um bloqueio).
  **Faltam**: sub-parte 5 (somar calorias de treino no resumo do M4) e confirmação de build/
  `installDebug`/sincronização real num device físico (nenhuma sessão até agora, Claude ou Codex,
  rodou isso num device de verdade para M5 — ver os itens em aberto no "Feito quando" de
  `specs/M5-treinos.md`).

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

Até 2026-07-09, uma sessão de Claude Code supervisionou parte do desenvolvimento do M4, delegando
implementação pra você via `codex exec` e fazendo build/install manualmente por causa da pegadinha
de sandbox descrita acima. A partir de agora, o usuário vai continuar o projeto trabalhando com
você diretamente (sem Claude Code no meio) até voltar a usar Claude Code depois. Isso não muda
nada do processo — as mesmas regras de `CLAUDE.md` valem, só que agora é você quem interage com o
usuário e decide quando commitar/parar, em vez de outra IA fazer isso por cima.
