CREATE TABLE IF NOT EXISTS public.food_measures (
  id BIGSERIAL PRIMARY KEY,
  food_id BIGINT NOT NULL REFERENCES public.foods(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  unit TEXT NOT NULL CHECK (unit IN ('g', 'ml', 'unit', 'tsp', 'tbsp', 'cup', 'serving')),
  grams NUMERIC NOT NULL CHECK (grams > 0),
  is_default BOOLEAN NOT NULL DEFAULT false,
  source TEXT,
  source_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS food_measures_food_id_idx ON public.food_measures (food_id);

ALTER TABLE public.food_measures ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "food_measures_select_all_auth" ON public.food_measures;
CREATE POLICY "food_measures_select_all_auth"
  ON public.food_measures FOR SELECT TO authenticated USING (true);

GRANT SELECT ON public.food_measures TO authenticated;
GRANT ALL ON public.food_measures TO service_role;
