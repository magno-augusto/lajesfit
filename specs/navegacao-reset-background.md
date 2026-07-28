# Bug: navegação reseta para o Feed ao voltar do background (Android)

**Status:** corrigido e validado no aparelho (J7 Prime / SM-G610M, Android 8.1) — 2026-07-28.

## Sintoma

Ao abrir **+ → Refeição**, adicionar itens (por voz) e tocar em **Adicionar foto**,
depois de escolher a foto na galeria o app **voltava para o Feed** — perdendo a tela
de criar refeição e todos os itens já adicionados. Reportado como "bug ao inserir uma
foto", mas a foto era só um dos gatilhos.

## O que NÃO era (descartado com evidência de logcat)

A primeira suspeita (num WIP guardado em `git stash`) era **pressão de memória**: o
`compressMealPhoto` decodificava a foto em resolução cheia e o SO mataria o app de
2 GB de RAM enquanto a galeria estava aberta. **Falso.** Em três reproduções no
aparelho:

- O **PID do processo não mudou** (30290 → 30290) → o app nunca foi morto.
- O `ViewRootImpl@<hash>` da `MainActivity` era **o mesmo** antes e depois, sem
  `am_on_create_called`/`am_on_destroy_called` → a **Activity nunca foi recriada**.

Ou seja: sem process death e sem recriação de Activity, o downsample **não** conserta
este bug (ataca uma causa que não ocorre).

Teste decisivo: apertar **Home** na tela de refeição e voltar pelos Recentes também
resetava para o Feed — provando que o gatilho é ir a **background (onStop)**, não a
foto.

## Causa raiz

Feed é a *start destination* do NavHost. Voltar para ela = o `NavController` foi
recriado. Como a Activity não é recriada, o único ponto que faz isso é o gate de auth
em `MainActivity.kt` → `LajesFitAppRoot`:

```kotlin
if (gateState is GateState.Loading) { CircularProgressIndicator(); return }
...
val navController = rememberNavController()   // renasce na start destination = Feed
```

Quando o app volta do background (`onStop → onStart`), o supabase-kt recarrega a sessão
e re-emite `sessionStatus`; o `gateState` (mapeado em `AuthGateViewModel`) pisca em
`Loading`; o `return` **descarta o NavHost inteiro**; ao voltar a `Ready`, o
`rememberNavController()` renasce no `startDestination` (Feed). O `remember { }` do
startDestination não protegia porque o `return` acima dele é reavaliado a cada
recomposição.

## Fix

`MainActivity.kt`: **congelar o `startDestination` na primeira resolução do gate** e não
deixar mais um `Loading` transiente descartar a navegação já montada. Transições reais
de sessão (login, logout, recovery, onboarding) continuam via navegação explícita, então
nada quebra. Uma vez resolvido o primeiro valor não-`Loading`, o root nunca mais entra no
`return` — o NavHost e o back stack sobrevivem a idas ao background.

## Validação (no aparelho, com o APK de debug do fix)

- **Home → voltar:** permanece na tela de refeição (log confirma `onStop → onResume` sem
  create/destroy). Antes: ia para o Feed.
- **Fluxo da foto:** adicionar foto (3 MB) → volta para a tela de refeição com "Foto
  selecionada". Antes: ia para o Feed.
- Cold start (app abre no Feed) e fechar a tela pelo "X" continuam corretos.

## Pendências / melhorias (não neste fix)

- Trocar `collectAsState` por **`collectAsStateWithLifecycle`** no gate — evita reagir a
  emissões enquanto a UI está parada; é a defesa idiomática contra esta classe de bug.
- Revisar `android:launchMode="singleTask"` (AndroidManifest): atípico para app
  single-Activity com Navigation Compose; foi posto pelo deep link de recovery. Mexer com
  cuidado.
- O WIP do downsample (`git stash`) segue guardado: **não** é o fix deste bug, mas ainda
  é uma boa prática para não estourar memória com fotos gigantes — avaliar à parte.
