# Editar e excluir refeicao (Android)

**Status:** feito e em producao (Android). Entregue no commit ff8e536; web ja
tinha o padrao (updateMealItems em meals-api.ts). Testado ponta a ponta no
celular fisico.

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
- A duplicata real no banco de producao (usuario de teste
  magnoaugustoss@gmail.com, Almoco de 27/07/2026) foi removida pela UI do app no
  commit ff8e536 (excluindo o diet_meal_id 71d085ad-ccbb-4bca-8968-fe3eb6c4a4c0 e
  mantendo o mais recente edb287b8), nunca por chamada direta ao banco.
