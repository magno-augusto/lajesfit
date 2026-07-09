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
4. Leia `specs/COORDENACAO.md` (quadro compartilhado entre Claude/Codex, seção abaixo) antes de
   editar qualquer arquivo do app — pode haver uma tarefa aberta com arquivos reservados.

## Equipe de agentes: Claude + Codex com autonomia simétrica

A execução do `specs/PLANO.md` pode ser feita por **Claude Code** ou **Codex** no mesmo checkout,
com igualdade de autonomia. Não há líder, fiscalizador ou implementador fixo por modelo. O agente
que assume uma tarefa aprovada passa a ser dono daquele escopo até concluir, entregar handoff ou
registrar bloqueio no quadro.

O protocolo específico do Codex está em `AGENTS.md` (mesma pasta); o quadro compartilhado de
coordenação é `specs/COORDENACAO.md`.

### Responsabilidades do agente dono da tarefa

- Confirmar que existe spec aprovada para o marco/sub-parte; se não existir, escrever a spec e
  parar para aprovação humana antes de implementar.
- Registrar ou atualizar a tarefa em `specs/COORDENACAO.md` com dono, spec/sub-parte, arquivos
  reservados e status.
- Implementar dentro do escopo reservado, sem duplicar trabalho de outra tarefa aberta.
- Rodar as validações possíveis na própria sessão; se device/adb, escrita fora do workspace ou
  outro recurso estiver bloqueado, registrar a pendência no handoff.
- Encerrar com handoff claro: o que fez, arquivos tocados, validações, pendências e próximo passo.
- Commitar sub-partes aprovadas com mensagem curta em português, seguindo o padrão do `git log`,
  salvo se o usuário pedir explicitamente para deixar sem commit.

### Quadro de coordenação (`specs/COORDENACAO.md`)

- Toda tarefa de marco, correção com risco de conflito ou trabalho em paralelo deve ter uma linha
  no quadro **antes** da edição, com dono, arquivos reservados e status.
- **Regra anti-conflito central**: enquanto uma tarefa está aberta, seus arquivos reservados são
  intocáveis pelo outro agente, e nenhuma função/tela/rota dela é implementada em duplicidade.
  Ambos os agentes leem o quadro antes de editar qualquer arquivo do app.
- Trabalho em paralelo só com conjuntos de arquivos **disjuntos**. Se dois trabalhos convergem no
  mesmo arquivo (caso típico: `navigation/LajesFitNavGraph.kt`, `Destinations.kt`,
  `app/build.gradle.kts`, manifest ou specs), sequencie pelo quadro: um agente reserva e edita; o
  outro registra a pendência ou assume depois que a reserva for liberada.

### Quando uma sessão chamar outra

Claude ou o usuário podem iniciar uma sessão Codex separada quando fizer sentido dividir trabalho.
Isso não cria hierarquia: o briefing só define escopo e contexto da tarefa. Para `codex exec`, use o
melhor modelo disponível e effort máximo — já são o padrão em `~/.codex/config.toml`
(`gpt-5.5` / `xhigh`), mas passe explícito para não depender do config global:

```powershell
codex exec -C . -s workspace-write `
  -c model="gpt-5.5" -c model_reasoning_effort="xhigh" `
  -o codex-handoff.md `
  "<briefing>"
```

O briefing deve sempre conter: (1) a tarefa e a sub-parte da spec — apontando para
`specs/M<n>-*.md` e `AGENTS.md` em vez de colar conteúdo; (2) a lista **fechada** de arquivos que
o Codex pode criar/editar; (3) os arquivos proibidos por reservas abertas; (4) o critério de
pronto; (5) a instrução de terminar com handoff. Ler `codex-handoff.md` (gitignored) ao final e
atualizar o quadro.

### Arquivos de integração sensíveis

`specs/*` (incluindo o quadro), `../supabase/migrations/*`, `gradle/libs.versions.toml`,
`app/build.gradle.kts`, `app/src/main/AndroidManifest.xml` e
`app/src/main/kotlin/com/lajesfit/android/navigation/*` são os pontos onde conflito dói mais. Eles
não pertencem a um agente por padrão; pertencem temporariamente ao agente que os reservar na tarefa
ativa.

### Permissões e ambiente

Cada agente usa os acessos disponíveis na própria sessão. Quando algo estiver bloqueado, registre
no handoff e peça ao usuário ou ao outro agente com acesso para executar:

- **Escrita fora do workspace** (ex.: migration em `../supabase/migrations/`): executar na sessão
  com permissão apropriada ou pedir ao usuário/outro agente. Nunca escalar para
  `-s danger-full-access` sem necessidade explícita.
- **Build dentro do sandbox**: funciona usando o cache repo-local já aquecido — definir
  `GRADLE_USER_HOME` para `<android/>\.gradle-user-home` antes do `gradlew.bat` (o daemon global
  em `C:\Users\magno\.gradle` falha por ACL do token do sandbox; o repo-local não). O diretório é
  gitignored.
- **Device/adb** (`installDebug`, logcat, screenshot): usar a sessão que tiver acesso ao device, ou
  pedir ao usuário para executar.

### Failover entre agentes

O quadro + o handoff existem exatamente para isso — a tarefa nunca pertence à sessão, pertence ao
quadro:

- Se qualquer agente ficar sem tokens/limite ou sair no meio de uma tarefa, o outro pode assumir.
- Quem assume lê `specs/COORDENACAO.md`, `git status` e `git diff`, herda as reservas da tarefa
  aberta e continua do ponto real do diff — nunca recomeça do zero nem descarta trabalho parcial
  sem pedido explícito do usuário.
- A troca de dono deve ser anotada na linha da tarefa.
- Para o failover ser barato, cada agente mantém o quadro atualizado **durante** o trabalho
  (status + notas), não só ao terminar.

### O que não muda

O gate de spec continua humano: nenhum marco novo começa sem spec aprovada pelo usuário. "Um marco
(ou sub-parte) por sessão" vale para a equipe como um todo — usar dois agentes não é licença para
empilhar marcos ou misturar escopos.

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

Sessões de agente rodando em ambiente sem Android SDK/Gradle/emulador **não conseguem compilar nem
rodar o app** — isso é esperado, não um bloqueio a resolver. Verificar o que dá:
consistência de package ID entre `app/build.gradle.kts`/`AndroidManifest.xml`/pacotes Kotlin, e
nomes de RPCs/tabelas batendo com `../supabase/migrations/*.sql`. Toda tela Compose deve ter um
`@Preview(showBackground = true)` para poder ser inspecionada no Android Studio sem build/emulador.
A compilação real, o lint e a execução em emulador/device ficam para quem abrir `android/` no
Android Studio.
