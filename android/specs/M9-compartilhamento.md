# M9 - Compartilhamento (desafios, treinos, refeições, posts)

Status: **aprovado (planejamento) em 2026-07-16; nenhuma sub-parte implementada ainda**.

## Objetivo

Criar um loop viral: o usuário compartilha uma imagem gerada (pódio do desafio, treino, refeição ou
post do feed) com uma legenda — a legenda carrega um convite pra baixar o app. Hoje **nenhum dos
quatro** existe no Android: não há nenhum uso de `Intent.ACTION_SEND`/`createChooser` no app, e o
próprio código/specs marcam "compartilhar post" como **fora de escopo** explicitamente
(`FeedScreen.kt:213-215`, `specs/M3-feed.md:151`, `specs/M6-desafios.md:130`).

## Decisão de escopo

**Só Android** — o web já tem funcionalidade parecida (boa referência de design, mecanismo
diferente), mas fica fora desta spec:
- Pódio: `src/features/challenges/podium-share-image.ts` desenha num `<canvas>` 1080×1350 (fundo
  escuro + glow laranja, marca LAJESFIT, degraus com cores de medalha, avatares circulares, coroa no
  1º) — mas só dispara quando o **líder troca** e só o **admin** vê/compartilha
  (`PodiumShareDialog.tsx`, via `navigator.share`). Não é "qualquer usuário, a qualquer momento".
- Feed: `PostCard.tsx` já tem botão "Compartilhar" (só pro dono do post), com overlay de
  estatísticas na foto (`share-image.ts`) + diálogo com WhatsApp/Instagram/copiar link.
- Treino e refeição avulsos não têm compartilhar em lugar nenhum, nem no web.

No Android o compartilhamento é mais simples: `Intent.ACTION_SEND` já abre o seletor nativo
(WhatsApp, Instagram, etc.) — não precisa montar botões por rede social como o web faz pra contornar
a Web Share API.

## Abordagem

### Sub-parte 1 — Infraestrutura compartilhada (pré-requisito de tudo)

- **Captura de imagem**: Compose BOM atual (`2024.09.03`, Compose UI ~1.7) já inclui
  `rememberGraphicsLayer()`/`GraphicsLayer.toImageBitmap()` — forma moderna de capturar qualquer
  Composable como bitmap, sem biblioteca nova. Novo `core/share/ShareImage.kt`: grava o card num
  `GraphicsLayer`, converte pra `ImageBitmap` → `Bitmap` Android, salva em
  `context.cacheDir/shared_images/`, gera URI `content://` via **`FileProvider`** novo (o manifest
  hoje não declara nenhum) e monta `Intent.ACTION_SEND` (`type="image/png"`, `EXTRA_STREAM`,
  `EXTRA_TEXT` = legenda, `FLAG_GRANT_READ_URI_PERMISSION`) dentro de `Intent.createChooser`.
- **Manifest**: novo `<provider android:name="androidx.core.content.FileProvider"
  android:authorities="${applicationId}.fileprovider" ...>` + `res/xml/file_paths.xml` (`cache-path`
  apontando pra `shared_images/`).
- **Legendas**: novo `core/share/ShareCaptions.kt`, uma função por tipo de conteúdo, todas
  terminando com o convite + link `https://lajesfit.vercel.app/beta` (página que já explica o passo
  a passo do grupo de testadores). Inclui lista de ~10 frases engraçadas parametrizadas (nome do
  líder + nome do quadro) pro pódio, ex.:
  ```
  "🏆 Sextou e {nome} continua disparado na liderança do {board}! O resto da cidade também tá tentando 😅"
  "😂 {nome} tá tão na frente que já devia cobrar pedágio dos concorrentes no {board}."
  "🔥 {nome} no topo de novo — alguém chama a Record pra filmar o próximo Power Couple fitness."
  ```
  (lista completa fica no código, fácil de editar/trocar o tom depois.)
- **Padrão de diálogo**: `ShareCardDialog` reutilizável — preview do card antes de compartilhar
  (mesma ideia do `PodiumShareDialog` do web), botão "Compartilhar" dispara a captura + o `Intent`.
  Cada tela só fornece o "conteúdo" do card (podium/treino/refeição/post) como slot.

### Sub-parte 2 — Desafios: compartilhar pódio

- `RankingCard` (`ChallengesScreen.kt:247-305`) ganha `onShare: (() -> Unit)?` — ícone de
  compartilhar no cabeçalho, ao lado do ícone/título do quadro. Habilitado por quadro (Atividades,
  Distância, Calorias, Dias ativos, Emagrecimento, Dias de dieta) sempre que `entries` não estiver
  vazio — o usuário escolhe qual pódio quer mostrar.
- Novo `PodiumShareCard`: fundo escuro + glow laranja, marca "LAJESFIT", nome do quadro, pódio de 3
  colunas com os 3 primeiros de `entries` (já ordenados por `rank`), degraus com cor de medalha
  (ouro/prata/bronze), avatar circular de cada um, coroa no 1º lugar, rodapé com o link.
- Legenda: frase engraçada + nome do líder + nome do quadro + link.

### Sub-parte 3 — Treinos: compartilhar treino

- `WorkoutCard` (`WorkoutsScreen.kt:348-422`) ganha terceiro `IconButton` (Compartilhar), ao lado de
  Editar/Remover.
- Novo `WorkoutShareCard`: fundo = foto do treino (`workout.mediaUrl`) quando existir, senão cartão
  gerado (gradiente); sobrepõe marca LAJESFIT + tipo de atividade/título + as 3 estatísticas já
  mostradas na tela (distância, tempo, calorias).
- Legenda: descrição curta (ex.: "Correu 5.2km em 31min queimando 410kcal no LajesFit 🔥") + link.

### Sub-parte 4 — Dieta: compartilhar refeição

- `MealSection` (`DietScreen.kt:420-506`) ganha segundo ícone no cabeçalho (ao lado do botão de
  Adicionar/Editar existente), habilitado só quando a seção tem itens.
- Novo `MealShareCard`: fundo = foto da refeição (`photoUrl` da seção) quando existir, senão cartão
  gerado; sobrepõe tipo de refeição (Café da manhã/Almoço/...) + kcal total + nº de itens.
- Legenda: ex.: "Café da manhã de hoje: 450kcal 🍳" + link.

### Sub-parte 5 — Feed: compartilhar post

- `PostCard` (`FeedScreen.kt:378-506`) ganha ícone de Compartilhar na linha de curtir/comentar,
  habilitado só para posts do próprio usuário (`canDelete`) — mesma regra do web
  (`canShare = currentUserId === post.user_id`). Remove o comentário "fora de escopo Android" que
  hoje existe ali e a exclusão equivalente em `specs/M3-feed.md`.
- Novo `PostShareCard`: reaproveita `post.mediaUrl` como fundo (mesma ideia do `share-image.ts` do
  web) + `WorkoutStatsBlock` quando for post de treino, senão só o texto do post.
- Legenda: `"{nome} no LajesFit: {conteúdo}"` (igual ao web) + link.

## Ordem de entrega

Cruza 4 áreas do app (Desafios/M6, Treinos/M5, Dieta/M4, Feed/M3) — será entregue em sub-partes
sequenciais, uma por sessão/commit, como já foi feito na tarefa #7 (fidelidade visual). Ordem: (1)
infraestrutura compartilhada → (2) Desafios → (3) Treinos → (4) Dieta → (5) Feed. Cada sub-parte
fecha com `:app:assembleDebug` OK antes do commit.

## Arquivos

- Novo: `core/share/ShareImage.kt`, `core/share/ShareCaptions.kt`, `res/xml/file_paths.xml`
- Editado: `AndroidManifest.xml` (FileProvider)
- Editado: `feature/challenges/ChallengesScreen.kt`, `feature/workouts/WorkoutsScreen.kt`,
  `feature/diet/DietScreen.kt`, `feature/feed/FeedScreen.kt`
- Editado: `specs/M3-feed.md`, `specs/M6-desafios.md` (remover exclusões de escopo desatualizadas),
  `specs/COORDENACAO.md`/`DIARIO-DE-BORDO.md` (registro)

Nenhuma mudança no site/web (escopo combinado: só Android).

## Verificação

- `:app:assembleDebug` após cada sub-parte.
- No device: tocar em "Compartilhar" em cada superfície, conferir o preview, confirmar que o
  seletor nativo do Android mostra WhatsApp/Instagram/etc., e testar o compartilhamento de verdade
  (ex.: mandando pra você mesmo) pra ver se imagem + texto chegam corretos.
