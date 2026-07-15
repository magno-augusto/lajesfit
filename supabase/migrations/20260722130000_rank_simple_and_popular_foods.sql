-- Melhora o ranking da busca de alimentos com dois criterios novos, pedidos
-- apos o caso da "banana cozida" (nenhum resultado, so pratos completos como
-- "banana da terra, cozida com queijo minas, cuscuz e ovo mexido"):
--
-- 1) Simplicidade: um alimento "sozinho" + variante de preparo (ex.: "banana
--    da terra, cozida", poucas palavras) passa a vencer pratos/receitas
--    compostas (ex.: "...cozida com queijo minas", muitas palavras).
-- 2) Popularidade real: entre itens igualmente simples, o que mais gente ja
--    lancou em diet_entries (ex.: "Coca-Cola", "Fanta Laranja") sobe no
--    ranking. A agregacao roda dentro da mesma funcao SECURITY DEFINER e so
--    expoe uma contagem por alimento, nunca quem consumiu o que.
CREATE INDEX IF NOT EXISTS diet_entries_food_id_idx
  ON public.diet_entries (food_id)
  WHERE food_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.search_foods(
  p_query TEXT,
  p_limit INT DEFAULT 20
)
RETURNS TABLE (
  id BIGINT,
  source TEXT,
  source_id TEXT,
  name TEXT,
  category TEXT,
  brand TEXT,
  kcal NUMERIC,
  protein_g NUMERIC,
  carbs_g NUMERIC,
  fat_g NUMERIC,
  fiber_g NUMERIC
)
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  WITH q AS (
    SELECT
      public.food_norm(p_query) AS norm_query,
      (
        SELECT array_agg('%' || token || '%')
        FROM unnest(regexp_split_to_array(public.food_norm(p_query), '\s+')) AS token
        WHERE token <> ''
      ) AS token_patterns
  ),
  pop AS (
    SELECT food_id, COUNT(*) AS uses
    FROM public.diet_entries
    WHERE food_id IS NOT NULL
    GROUP BY food_id
  )
  SELECT
    f.id,
    f.source,
    f.source_id,
    f.name,
    f.category,
    f.brand,
    f.kcal,
    f.protein_g,
    f.carbs_g,
    f.fat_g,
    f.fiber_g
  FROM public.foods f
  CROSS JOIN q
  LEFT JOIN pop ON pop.food_id = f.id
  WHERE
    public.food_norm(
      f.name || ' ' || coalesce(f.brand, '') || ' ' || coalesce(f.category, '') || ' ' ||
      array_to_string(coalesce(f.aliases, '{}'), ' ')
    ) ILIKE ALL (q.token_patterns)
  ORDER BY
    -- comeca com o termo buscado
    CASE WHEN public.food_norm(f.name) LIKE q.norm_query || '%' THEN 0 ELSE 1 END,
    -- todas as palavras aparecem no proprio nome (nao so em alias/marca/categoria)
    CASE WHEN public.food_norm(f.name) ILIKE ALL (q.token_patterns) THEN 0 ELSE 1 END,
    -- alimento "sozinho" + variante de preparo antes de prato/receita composta
    array_length(regexp_split_to_array(btrim(f.name), '\s+'), 1),
    -- o que as pessoas mais adicionam de verdade nas refeicoes
    COALESCE(pop.uses, 0) DESC,
    -- fontes brasileiras/curadas primeiro
    CASE f.source
      WHEN 'taco' THEN 0
      WHEN 'estimated' THEN 1
      WHEN 'manual' THEN 2
      WHEN 'tbca' THEN 3
      WHEN 'open_food_facts' THEN 4
      ELSE 5
    END,
    -- versoes cruas por ultimo, a menos que o usuario busque por "cru"
    CASE
      WHEN q.norm_query ~ '\mcrua?\M' THEN 0
      WHEN public.food_norm(f.name) ~ '\mcrua?\M' THEN 1
      ELSE 0
    END,
    similarity(public.food_norm(f.name), q.norm_query) DESC,
    length(f.name) ASC,
    f.name
  LIMIT p_limit;
$$;

GRANT EXECUTE ON FUNCTION public.search_foods TO authenticated;
