-- Melhora a busca de alimentos: insensivel a acentos, correspondencia por
-- token (todas as palavras, em qualquer ordem), pesquisa em aliases/marca/
-- categoria e ranking por similaridade. Antes era um unico ILIKE no nome.
CREATE EXTENSION IF NOT EXISTS unaccent;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- unaccent() e' STABLE; o wrapper com dicionario fixo e' imutavel e permite indice
CREATE OR REPLACE FUNCTION public.food_norm(p_text TEXT)
RETURNS TEXT
LANGUAGE sql IMMUTABLE PARALLEL SAFE AS $$
  SELECT lower(public.unaccent('public.unaccent'::regdictionary, coalesce(p_text, '')));
$$;

CREATE INDEX IF NOT EXISTS foods_name_norm_trgm_idx
  ON public.foods USING gin (public.food_norm(name) gin_trgm_ops);

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
    similarity(public.food_norm(f.name), q.norm_query) DESC,
    length(f.name) ASC,
    f.name
  LIMIT p_limit;
$$;

GRANT EXECUTE ON FUNCTION public.search_foods TO authenticated;

-- Aliases brasileiros para itens frequentes (nomes regionais e populares)
UPDATE public.foods SET aliases = ARRAY['macaxeira', 'aipim']
  WHERE source = 'taco' AND name ILIKE 'mandioca%' AND (aliases IS NULL OR aliases = '{}');
UPDATE public.foods SET aliases = ARRAY['mexerica', 'bergamota', 'poncã']
  WHERE source = 'taco' AND name ILIKE 'tangerina%' AND (aliases IS NULL OR aliases = '{}');
UPDATE public.foods SET aliases = ARRAY['coca', 'coca-cola', 'refri']
  WHERE source = 'taco' AND name ILIKE 'refrigerante, tipo cola%' AND (aliases IS NULL OR aliases = '{}');
UPDATE public.foods SET aliases = ARRAY['pao de sal', 'cacetinho', 'pao carioquinha']
  WHERE source = 'taco' AND name ILIKE 'pão, trigo, francês%' AND (aliases IS NULL OR aliases = '{}');
UPDATE public.foods SET aliases = ARRAY['jerimum']
  WHERE source = 'taco' AND name ILIKE 'abóbora%' AND (aliases IS NULL OR aliases = '{}');
UPDATE public.foods SET aliases = ARRAY['ovo cozido', 'ovo de galinha']
  WHERE source = 'taco' AND name ILIKE 'ovo, de galinha%' AND (aliases IS NULL OR aliases = '{}');
UPDATE public.foods SET aliases = ARRAY['frango assado', 'peito de frango']
  WHERE source = 'taco' AND name ILIKE 'frango, peito%' AND (aliases IS NULL OR aliases = '{}');
UPDATE public.foods SET aliases = ARRAY['carne moida']
  WHERE source = 'taco' AND name ILIKE 'carne, bovina, acém, moído%' AND (aliases IS NULL OR aliases = '{}');
UPDATE public.foods SET aliases = ARRAY['bife']
  WHERE source = 'taco' AND name ILIKE 'carne, bovina, contra-filé%' AND (aliases IS NULL OR aliases = '{}');
UPDATE public.foods SET aliases = ARRAY['cuscuz nordestino', 'cuscuz de milho']
  WHERE source = 'taco' AND name ILIKE 'cuscuz, de milho%' AND (aliases IS NULL OR aliases = '{}');
UPDATE public.foods SET aliases = ARRAY['tapioca']
  WHERE source = 'taco' AND name ILIKE '%polvilho%' AND (aliases IS NULL OR aliases = '{}');
UPDATE public.foods SET aliases = ARRAY['farofa']
  WHERE source = 'taco' AND name ILIKE 'farinha, de mandioca%' AND (aliases IS NULL OR aliases = '{}');
UPDATE public.foods SET aliases = ARRAY['acai']
  WHERE source = 'taco' AND name ILIKE 'açaí%' AND (aliases IS NULL OR aliases = '{}');
UPDATE public.foods SET aliases = ARRAY['danone']
  WHERE source = 'taco' AND name ILIKE 'iogurte%morango%' AND (aliases IS NULL OR aliases = '{}');
UPDATE public.foods SET aliases = ARRAY['miojo', 'lamen', 'macarrao instantaneo']
  WHERE source = 'taco' AND name ILIKE 'macarrão, instantâneo%' AND (aliases IS NULL OR aliases = '{}');
