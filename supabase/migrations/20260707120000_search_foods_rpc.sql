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
  WHERE
    f.name ILIKE '%' || p_query || '%'
  ORDER BY
    -- Prioridade: começa com o termo > contém o termo > outros
    CASE WHEN f.name ILIKE p_query || '%' THEN 0 ELSE 1 END,
    -- Fontes nativas primeiro (taco, estimadas) depois industrializados
    CASE f.source
      WHEN 'taco' THEN 0
      WHEN 'estimated' THEN 1
      WHEN 'manual' THEN 2
      WHEN 'open_food_facts' THEN 3
      WHEN 'tbca' THEN 4
      ELSE 5
    END,
    f.name
  LIMIT p_limit;
$$;

GRANT EXECUTE ON FUNCTION public.search_foods TO authenticated;
