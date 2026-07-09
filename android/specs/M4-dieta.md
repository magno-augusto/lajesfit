# M4 — Diário de dieta

Status: **spec escrita, aguardando revisão antes de implementar** (spec-driven development, ver
`CLAUDE.md`). Marco potencialmente grande (`CLAUDE.md` já avisa sobre M4/M7) — ver "Notas de
execução" no fim sobre possível divisão em sub-partes/commits.

## Objetivo

Portar o diário de dieta do web (`DiaryPage.tsx` + `meals-api.ts` + `food-catalog.ts` +
`AddFoodDialog.tsx` + `BarcodeScannerDialog.tsx`) para Android: visão do dia atual (stepper
anterior/próximo, não calendário completo — decisão já registrada em `specs/PLANO.md:128`),
**`AddEditMealScreen`** com busca de alimento (RPC `search_foods`) + cadastro manual (RPC
`upsert_catalog_food`), e **`BarcodeScannerScreen`** (ML Kit + CameraX) com fallback Open Food
Facts, devolvendo o alimento encontrado para `AddEditMealScreen` via
`NavBackStackEntry.savedStateHandle`.

## Comportamento do web a espelhar (fonte da verdade)

Lido em `src/features/diet/meals-api.ts`, `food-catalog.ts`, `AddFoodDialog.tsx`,
`BarcodeScannerDialog.tsx`, `image-utils.ts`, `src/features/diary/DiaryPage.tsx`,
`src/features/fitness/useFitness.ts` e `supabase/migrations/*.sql`:

- **Registrar refeição** (`addMealWithItems`, `meals-api.ts:197-292`): se `items` vier vazio (log só
  com foto), substitui por um item placeholder (`"Refeicao registrada"`, tudo zerado) — assim um
  registro só-com-foto ainda aparece no diário. Sobe a foto (se houver) pro bucket `media`, path
  `${userId}/meals/${timestamp}-${nomeSanitizado}`, gera signed URL de 5 anos (mesmo padrão de
  `posts.media_url` já visto no M3). Insere **uma linha em `diet_meals`** (`user_id, meal,
  photo_url, consumed_at`), depois **N linhas em `diet_entries`** (uma por item, todas com o mesmo
  `diet_meal_id`). `consumed_at` usa a data do dia selecionado no diário mas a **hora atual**
  (`AddFoodDialog.tsx:161-166`).
- **Post automático no feed** (`meals-api.ts:280-284`, **sem exceção, sem opção de desligar**):
  todo `addMealWithItems` bem-sucedido insere também uma linha em `posts` (`user_id, content,
  media_url`). O texto precisa bater **exatamente** com o web porque o feed (M3) infere o tipo
  `"diet"` por prefixo de string, não por coluna (`feed-api.ts:39-46`, já portado em
  `FeedRepository.inferPostType`):
  - Sem itens (só placeholder): `"{Label da refeicao} registrado na dieta."`
  - Com itens: 4 linhas —
    ```
    {Label da refeicao} registrado na dieta.
    Total: {kcal arredondado} kcal - {protein.toFixed(1)}P / {carbs.toFixed(1)}C / {fat.toFixed(1)}G.
    Itens:
    - {grams}g {nome}
    - {grams}g {nome}
    ```
    (uma linha `- {grams}g {nome}` por item, `\n` entre tudo). Labels exatos: `breakfast` →
    "Cafe da manha", `lunch` → "Almoco", `snack` → "Lanche", `dinner` → "Jantar". **Reproduzir esses
    strings literalmente** — é o mesmo banco do web, um texto diferente quebra a detecção de tipo
    lá também.
  - `media_url` do post = mesma signed URL da foto da refeição (ou `null`).
- **Apagar item** (`removeMeal`, `meals-api.ts:311-319`): `DELETE FROM diet_entries WHERE
  id=id AND user_id=userId` — apaga só a linha do item, não o grupo `diet_meals` inteiro.
- **Resumo calórico do dia** (`CalorieRing.tsx:29-30`): `remaining = round(meta - consumido +
  queimado)`, `percent do anel = min(100, consumido/meta*100)` (0 se meta for 0). `meta` vem de
  `idrProfile.idrCalories` (já implementado no M2, `GoalsRepository.getIdrProfile()`). `queimado`
  viria de treinos do dia — **M5 (Treinos) ainda não existe no Android**, então por ora `queimado =
  0` fixo (ver "Fora do escopo").
- **Busca de alimento** (`searchFoods`, `food-catalog.ts:375-378` → RPC `search_foods(p_query,
  p_limit)`): retorna `id, source, source_id, name, category, brand, kcal, protein_g, carbs_g,
  fat_g, fiber_g` — **sem measures**. As medidas (`food_measures`) de um alimento da tabela `foods`
  precisam de uma segunda busca (`food_measures.select(...).eq("food_id", id)`).
- **Cadastro manual** (`upsertCatalogFood` → RPC `upsert_catalog_food`, `food-catalog.ts:562-567`):
  só aceita `source IN ('open_food_facts', 'manual')` — usado tanto pro "cadastrar alimento
  manualmente" quanto pra **cachear** um resultado do Open Food Facts encontrado (por busca ou
  scan) na tabela `foods`, pra próximas buscas acharem sem precisar bater na API de novo. No web
  isso é best-effort (erro só vira `console.warn`, não trava o fluxo) — mesma postura no Android.
- **Scanner de código de barras** (`BarcodeScannerDialog.tsx`): no web usa a `BarcodeDetector` API
  do navegador; no Android é **ML Kit Barcode Scanning + CameraX** (decisão já fechada em
  `CLAUDE.md`), mas o **fluxo de dados é o mesmo**: código detectado → `lookupOpenFoodFactsByBarcode`
  → sucesso preenche o formulário, falha mostra erro com opção de digitar o código manualmente
  (sem tentar de novo automaticamente).
  - **`lookupOpenFoodFactsByBarcode`** (`food-catalog.ts:509-557`): `GET
    https://world.openfoodfacts.net/api/v2/product/{barcode}.json?fields=code,product_name,
    product_name_pt,brands,categories,serving_size,nutriments`, header
    `User-Agent: LajesFit/1.0 (https://lajesfit.vercel.app)` (a API da Open Food Facts exige um
    User-Agent identificável — não omitir). Retorna `null` se `status != 1` ou sem `product`, ou se
    depois de mapeado não tiver nome ou `calories <= 0`.
  - Campos de nutrição lidos de `nutriments` (todos **por 100g**): `energy-kcal_100g` (fallback
    `energy-kcal_value`), `proteins_100g`, `carbohydrates_100g`, `fat_100g`, `fiber_100g`. Nome:
    `product_name_pt` com fallback `product_name`.
  - `serving_size` (string livre, ex. "30 g") é parseada com regex `(\d+(?:\.\d+)?)\s*(g|ml)` pra
    virar uma medida "porção" default; se não parsear, cai numa medida genérica em gramas.
  - Alimento encontrado por scan **também** passa por `cacheFoodInCatalog` (best-effort).
- **Compressão de foto** (`image-utils.ts:28-43`, `compressImageDataUrl`, compartilhada com o
  `CreatePostDialog` do feed — mesma função, dois usos): redimensiona pra no máximo **1400px** no
  maior lado, reencoda como **JPEG qualidade 0.82**. Replicar essa mesma regra no Android
  (`BitmapFactory`/`Bitmap.createScaledBitmap` + `Bitmap.compress(JPEG, 82, ...)`), já que a mesma
  regra deveria valer pro upload de mídia do feed quando ele ganhar isso (ver notas do M3).
- **Visão do dia** (`DiaryPage.tsx`): 4 seções fixas na ordem `breakfast → lunch → snack → dinner`
  (rótulos e ícones: Café da manhã/Almoço/Lanche/Jantar), cada uma agrupando os `diet_entries` do
  dia por `diet_meal_id` (pode haver mais de um grupo por tipo no mesmo dia — cada
  `addMealWithItems` cria um grupo novo). Cada grupo mostra a foto (se tiver), total de kcal, e a
  lista de itens.

## Schema (fonte da verdade — `supabase/migrations/*.sql`, não recriar nem redesenhar)

- **`diet_meals`**: `id uuid pk`, `user_id`, `meal text` (`'breakfast'|'lunch'|'snack'|'dinner'`,
  texto livre, não enum), `photo_url text` (nullable), `consumed_at timestamptz`, `created_at`,
  `updated_at`. RLS: CRUD só dono.
- **`diet_entries`**: `id uuid pk`, `user_id`, `diet_meal_id uuid` (nullable, FK
  `ON DELETE SET NULL`), `food_id int` (nullable, **não é FK enforced**), `food_name text`,
  `meal text`, `grams numeric`, `kcal numeric`, `protein_g/carbs_g/fat_g numeric default 0`,
  `photo_url text` (nullable — legado, o app deve usar o `photo_url` do `diet_meals` do grupo),
  `consumed_at timestamptz`, `created_at`, `updated_at`. RLS: CRUD só dono.
- **`foods`** (catálogo): `id bigserial pk`, `source text CHECK IN ('tbca','taco',
  'open_food_facts','manual','estimated')`, `source_id text`, `name text`, `category text`,
  `brand text`, `kcal/protein_g/carbs_g/fat_g/fiber_g numeric`, `aliases text[]`,
  `UNIQUE(source, source_id)`. RLS: **select-only** pra `authenticated` — escrita só via a RPC
  `upsert_catalog_food` (`SECURITY DEFINER`).
- **`food_measures`**: `id bigserial pk`, `food_id bigint fk`, `label text`, `unit text CHECK IN
  ('g','ml','unit','tsp','tbsp','cup','serving')`, `grams numeric CHECK > 0`, `is_default boolean`.
  RLS: select-only.
- **RPC `search_foods(p_query text, p_limit int default 20)`**: já existe, `SECURITY DEFINER`,
  `GRANT EXECUTE TO authenticated`. Não recriar — só chamar.
- **RPC `upsert_catalog_food(p_source, p_source_id, p_name, p_category, p_brand, p_kcal,
  p_protein_g, p_carbs_g, p_fat_g, p_fiber_g, p_measures jsonb) RETURNS bigint`**: idem, já existe.
  `p_measures` é um array JSON de medidas (`label, unit, grams, is_default`).
- **`profiles.calorie_goal`** e demais `goal_*`: já usados pelo `GoalsRepository` do M2, reusar
  `getIdrProfile()` pra pegar a meta calórica — não duplicar essa busca.
- Bucket `media` (mesmo do feed/M3): meal photos em `${userId}/meals/${timestamp}-{nome}`, signed
  URL de 5 anos.

## Arquitetura no Android

- **`feature/diet/`** (pasta hoje só com os 2 placeholders do M0):
  - **`DietRepository.kt`**: `getMeals(): List<LocalMeal>` (join `diet_entries` +
    `diet_meals(photo_url)`, com fallback sem o join se falhar — mesmo padrão defensivo do web,
    `meals-api.ts:79-106`), `addMealWithItems(meal, items, photoBytes?, consumedAt): List<LocalMeal>`
    (upload de foto + insert `diet_meals` + insert `diet_entries` + **insert direto em `posts`**
    com o texto exato documentado acima — não depender de `FeedRepository` pra esse insert, é uma
    chamada Postgrest simples e autocontida), `removeMeal(entryId: String)`.
  - **`FoodCatalogRepository.kt`**: `searchFoods(query): List<TacoFood>` (RPC + busca de
    `food_measures` pros ids retornados), `upsertCatalogFood(food, measures): Long` (RPC),
    `lookupOpenFoodFactsByBarcode(barcode): TacoFood?` (HTTP direto, ver abaixo).
  - **Cliente HTTP pro Open Food Facts**: a Open Food Facts **não é o Supabase** — precisa de um
    `HttpClient` Ktor separado (engine OkHttp, já é dependência do projeto), provido via Hilt como
    singleton, com o header `User-Agent` fixo. Não reusar/expor internals do `SupabaseClient` pra
    isso.
  - **Compressão de imagem**: função utilitária (`MealPhoto.kt` ou similar) replicando
    `compressImageDataUrl` — decodifica com `BitmapFactory`, redimensiona pra máx. 1400px no maior
    lado, reencoda JPEG qualidade 82.
  - **`DietScreen.kt` + `DietViewModel.kt`**: dia selecionado (`StateFlow<LocalDate>`), stepper
    anterior/próximo (só botões — sem swipe, sem calendário, ver "Fora do escopo"), busca
    `getMeals()` e filtra client-side pelo dia selecionado (mesma estratégia do web —
    `getMeals()` não filtra no servidor; ver "Notas" sobre otimizar isso depois se virar problema
    real), resumo calórico (`meta` de `GoalsRepository.getIdrProfile()`, `consumido` = soma do dia,
    `queimado = 0`), 4 seções por tipo de refeição agrupadas por `diet_meal_id`.
  - **`AddEditMealScreen.kt` + `AddEditMealViewModel.kt`**: recebe o tipo de refeição alvo (arg de
    navegação, pré-selecionado ao tocar numa seção específica do diário), campo de busca
    (debounce ~400ms chamando `searchFoods`), ícone de código de barras que navega pra
    `BarcodeScannerScreen`, mini-formulário de cadastro manual (nome, marca, kcal/proteína/carbo/
    gordura por 100g) quando a busca não encontra nada, seletor de quantidade+medida, lista de
    itens adicionados com totais, picker de foto opcional (galeria, via
    `rememberLauncherForActivityResult` — não precisa de Activity própria), submit chama
    `addMealWithItems`.
  - **`BarcodeScannerScreen.kt` + `BarcodeScannerViewModel.kt`** (novo): permissão de câmera em
    runtime (`RequestPermission` launcher + racional se negado), preview CameraX + análise via ML
    Kit Barcode Scanning (formatos EAN-13/EAN-8/UPC-A/UPC-E/Code128, espelhando os formatos do web),
    ao detectar chama `lookupOpenFoodFactsByBarcode`; sucesso devolve o alimento pra
    `AddEditMealScreen` via `NavBackStackEntry.savedStateHandle` (serializar o `TacoFood` como JSON
    numa `String` — `SavedStateHandle`/`Bundle` não carrega objetos complexos direto) e faz
    `popBackStack()`; erro mostra mensagem com opção de digitar o código manualmente (campo de
    texto, mesmo fallback do web) e tentar de novo.
- **Novas dependências**: CameraX (`camera-core`, `camera-camera2`, `camera-lifecycle`,
  `camera-view`) e ML Kit Barcode Scanning (`com.google.mlkit:barcode-scanning`) — já previstas em
  `CLAUDE.md`, ainda não adicionadas ao `libs.versions.toml`. `AndroidManifest.xml` precisa de
  `<uses-permission android:name="android.permission.CAMERA" />` e
  `<uses-feature android:name="android.hardware.camera" android:required="false" />`.
- **`Destinations.kt`**: `PopOverRoutes.AddMeal` já existe (`"meal/add"`) — estender pra aceitar o
  tipo de refeição pré-selecionado (ex. `"meal/add?meal={meal}"`, opcional). Nova rota
  `PopOverRoutes.BarcodeScanner = "diet/scanner"` (nome já sugerido em `specs/PLANO.md:36`).
- **Modelos**: `MealType` enum (breakfast/lunch/snack/dinner, com `label` — mesmo estilo de
  `Sex`/`ActivityLevel` do M2), `TacoFood`, `FoodMeasure`, `LocalMeal`, `MealFoodInput` — nomes
  livres, mas as strings de `meal`/labels de refeição precisam bater com as constantes acima.

## Fora do escopo deste marco (propositalmente)

- **Editar refeição existente** (`updateMealItems`/`replaceLegacyMealEntries` — substituir todos os
  itens de um grupo já salvo) e **anexar foto a uma refeição sem foto depois** (`updateDietMealPhoto`)
  — só criar (com foto opcional) e apagar item nesta fase. Editar fica pra um refinamento futuro.
- **Calendário completo + gráficos semanais** (`WeeklyCalorieChart`/`WeeklyWorkoutChart`) e
  **swipe pra trocar de dia** — só os botões anterior/próximo, decisão já registrada em
  `specs/PLANO.md:128`.
- **Busca suplementar em texto livre no Open Food Facts** (`searchOpenFoodFactsFoods`, distinta da
  busca por código de barras) e as abas **"Mais adicionados"/"Adicionados recentemente"** — a busca
  via `search_foods` (banco) já cobre o "Feito quando"; a OFF por texto e o histórico ficam pra
  depois.
- **"Sugerir alimento"** (`food_requests`) quando a busca não acha nada.
- **Calorias queimadas de treinos** no resumo diário — fixo em 0 até o M5 (Treinos) existir; ajustar
  a fórmula depois, não reimplementar.
- **Lightbox de foto** (tocar na foto pra abrir em tela cheia) — mostrar a foto no card já basta.

## Feito quando

- [ ] Abrir Dieta mostra o dia atual com as 4 seções de refeição; os botões anterior/próximo
      trocam o dia e recarregam os dados certos.
- [ ] O resumo calórico do dia bate com a fórmula (meta do onboarding − consumido do dia + 0 de
      treino) pra pelo menos um dia com refeições registradas.
- [ ] Buscar um alimento pelo nome usa `search_foods` e mostra resultados reais do catálogo.
- [ ] Cadastrar um alimento manualmente grava via `upsert_catalog_food` e aparece numa busca
      seguinte.
- [ ] Escanear um código de barras real (produto embalado comum) encontra o alimento via Open Food
      Facts e preenche o formulário; um código inválido/não encontrado mostra erro com opção de
      digitar manualmente, sem travar a tela.
- [ ] Registrar uma refeição (buscada, escaneada ou manual, com ou sem foto) grava em
      `diet_meals`/`diet_entries` e aparece no diário do dia certo.
- [ ] O registro cria um post no feed com o texto exato esperado; abrir o Feed (M3) mostra esse
      post com o badge "Dieta".
- [ ] Apagar um item de uma refeição remove de `diet_entries` e some do diário.

## Notas de execução (marco grande — CLAUDE.md M4/M7)

Se a sessão de implementação ficar longa, dividir em commits/sub-partes nesta ordem sugerida (cada
um deixando o projeto compilando): (1) `DietRepository`/modelos + `DietScreen` lendo dados reais
(sem adicionar nada ainda); (2) `AddEditMealScreen` com busca via `search_foods` + cadastro manual
+ `addMealWithItems` (sem scanner, sem foto); (3) foto (picker + compressão + upload); (4)
`BarcodeScannerScreen` (CameraX + ML Kit + Open Food Facts) por último, já que é a parte
tecnicamente mais isolada e arriscada (câmera, permissão, biblioteca nova).

## Notas para o próximo marco (M5)

- `queimado = 0` fixo no resumo calórico do M4 precisa ser ligado às calorias de treino do dia
  assim que M5 (Treinos/Health Connect) existir.
- O padrão de `HttpClient` Ktor dedicado (fora do `SupabaseClient`) criado aqui pro Open Food Facts
  é reutilizável se M5 precisar de alguma chamada HTTP direta fora do Supabase.
