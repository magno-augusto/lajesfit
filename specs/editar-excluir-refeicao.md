# Editar e excluir refeicao (Android)

**Status:** em andamento.

## Problema

Tocar no lapis de uma refeicao ja existente (tela de Dieta) abre a mesma tela de
"adicionar" vazia -- nao carrega os itens ja salvos. Salvar sempre cria uma
refeicao nova (`INSERT` em `diet_meals`), mesmo quando a intencao era editar.
Resultado: registros duplicados quando o usuario tenta "editar" mais de uma vez.

## Padrao a seguir (ja existe e funciona no web)

`updateMealItems(dietMealId, items, nextMeal?)` em `src/features/diet/meals-api.ts`:
apaga todos os itens do `diet_meal_id` em `diet_entries` e reinsere a lista final
(nao faz diff item a item por id).

## Escopo

1. Carregar itens existentes ao abrir uma refeicao para edicao (passar
   `dietMealId` na navegacao).
2. Remover/adicionar itens localmente (fluxos ja existentes: busca TACO, manual,
   scanner, voz).
3. Salvar em modo edicao = update (apaga+reinsere), nao cria `diet_meals` novo.
4. Excluir a refeicao inteira.

## Observacoes

- `diet_entries.diet_meal_id` -> `diet_meals.id` e `ON DELETE SET NULL`.
- Nao ha FK entre `posts` e `diet_meals` (diferente de `workouts`, que tem
  `posts.workout_id`) -- tratar o post do feed e melhor esforco.
- Ha uma duplicata real no banco de producao (usuario de teste
  magnoaugustoss@gmail.com, Almoco de 27/07/2026) que deve ser limpa usando esta
  mesma feature pela UI, nunca por chamada direta ao banco.
