CREATE TABLE IF NOT EXISTS public.diet_meals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  meal TEXT NOT NULL,
  photo_url TEXT,
  consumed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS diet_meals_user_consumed_idx
  ON public.diet_meals(user_id, consumed_at DESC);

ALTER TABLE public.diet_meals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "diet_meals_own_all" ON public.diet_meals;
CREATE POLICY "diet_meals_own_all"
  ON public.diet_meals FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.diet_meals TO authenticated;
GRANT ALL ON public.diet_meals TO service_role;

DROP TRIGGER IF EXISTS diet_meals_set_updated_at ON public.diet_meals;
CREATE TRIGGER diet_meals_set_updated_at
  BEFORE UPDATE ON public.diet_meals
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.diet_entries
  ADD COLUMN IF NOT EXISTS diet_meal_id UUID REFERENCES public.diet_meals(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS diet_entries_diet_meal_id_idx
  ON public.diet_entries(diet_meal_id);

NOTIFY pgrst, 'reload schema';
