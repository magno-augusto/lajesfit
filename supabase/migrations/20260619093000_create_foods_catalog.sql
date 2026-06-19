CREATE TABLE IF NOT EXISTS public.foods (
  id BIGSERIAL PRIMARY KEY,
  source TEXT NOT NULL CHECK (source IN ('tbca', 'taco', 'open_food_facts', 'manual')),
  source_id TEXT,
  name TEXT NOT NULL,
  category TEXT,
  brand TEXT,
  kcal NUMERIC NOT NULL,
  protein_g NUMERIC NOT NULL DEFAULT 0,
  carbs_g NUMERIC NOT NULL DEFAULT 0,
  fat_g NUMERIC NOT NULL DEFAULT 0,
  fiber_g NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (source, source_id)
);

CREATE INDEX IF NOT EXISTS foods_name_search_idx
  ON public.foods USING gin (to_tsvector('portuguese', name));

CREATE INDEX IF NOT EXISTS foods_source_idx ON public.foods (source);

ALTER TABLE public.foods ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "foods_select_all_auth" ON public.foods;
CREATE POLICY "foods_select_all_auth"
  ON public.foods FOR SELECT TO authenticated USING (true);

GRANT SELECT ON public.foods TO authenticated;
GRANT ALL ON public.foods TO service_role;

INSERT INTO public.foods (
  source,
  source_id,
  name,
  category,
  kcal,
  protein_g,
  carbs_g,
  fat_g,
  fiber_g
)
SELECT
  'taco',
  id::TEXT,
  name,
  category,
  kcal,
  protein_g,
  carbs_g,
  fat_g,
  fiber_g
FROM public.taco_foods
ON CONFLICT (source, source_id) DO UPDATE SET
  name = EXCLUDED.name,
  category = EXCLUDED.category,
  kcal = EXCLUDED.kcal,
  protein_g = EXCLUDED.protein_g,
  carbs_g = EXCLUDED.carbs_g,
  fat_g = EXCLUDED.fat_g,
  fiber_g = EXCLUDED.fiber_g;
