-- Prioriza alimentos preparados/cozidos sobre crus no ranking da busca:
-- quem registra refeicao quase sempre consome a versao cozida.
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
  FROM public.foods f, q
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
