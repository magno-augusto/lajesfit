CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TABLE IF NOT EXISTS public.diet_meals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  meal TEXT NOT NULL,
  photo_url TEXT,
  consumed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.diet_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  diet_meal_id UUID REFERENCES public.diet_meals(id) ON DELETE SET NULL,
  food_id INT,
  food_name TEXT NOT NULL,
  meal TEXT NOT NULL,
  grams NUMERIC NOT NULL,
  kcal NUMERIC NOT NULL,
  protein_g NUMERIC NOT NULL DEFAULT 0,
  carbs_g NUMERIC NOT NULL DEFAULT 0,
  fat_g NUMERIC NOT NULL DEFAULT 0,
  photo_url TEXT,
  consumed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.diet_meals
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS meal TEXT,
  ADD COLUMN IF NOT EXISTS photo_url TEXT,
  ADD COLUMN IF NOT EXISTS consumed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

ALTER TABLE public.diet_entries
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS diet_meal_id UUID REFERENCES public.diet_meals(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS food_id INT,
  ADD COLUMN IF NOT EXISTS food_name TEXT,
  ADD COLUMN IF NOT EXISTS meal TEXT,
  ADD COLUMN IF NOT EXISTS grams NUMERIC,
  ADD COLUMN IF NOT EXISTS kcal NUMERIC,
  ADD COLUMN IF NOT EXISTS protein_g NUMERIC NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS carbs_g NUMERIC NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS fat_g NUMERIC NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS photo_url TEXT,
  ADD COLUMN IF NOT EXISTS consumed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

CREATE INDEX IF NOT EXISTS diet_meals_user_consumed_idx
  ON public.diet_meals(user_id, consumed_at DESC);

CREATE INDEX IF NOT EXISTS diet_entries_user_consumed_idx
  ON public.diet_entries(user_id, consumed_at DESC);

CREATE INDEX IF NOT EXISTS diet_entries_diet_meal_id_idx
  ON public.diet_entries(diet_meal_id);

DO $$
BEGIN
  IF to_regclass('public.foods') IS NOT NULL THEN
    UPDATE public.foods AS food
    SET source_id = replace(food.source_id, 'lajes-fit:', 'lajesfit:')
    WHERE food.source_id LIKE 'lajes-fit:%'
      AND NOT EXISTS (
        SELECT 1
        FROM public.foods AS existing
        WHERE existing.source = food.source
          AND existing.source_id = replace(food.source_id, 'lajes-fit:', 'lajesfit:')
      );
  END IF;
END;
$$;

ALTER TABLE public.diet_meals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.diet_entries ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'diet_meals' AND policyname = 'diet_meals_select_own'
  ) THEN
    CREATE POLICY "diet_meals_select_own"
      ON public.diet_meals FOR SELECT TO authenticated
      USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'diet_meals' AND policyname = 'diet_meals_insert_own'
  ) THEN
    CREATE POLICY "diet_meals_insert_own"
      ON public.diet_meals FOR INSERT TO authenticated
      WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'diet_meals' AND policyname = 'diet_meals_update_own'
  ) THEN
    CREATE POLICY "diet_meals_update_own"
      ON public.diet_meals FOR UPDATE TO authenticated
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'diet_meals' AND policyname = 'diet_meals_delete_own'
  ) THEN
    CREATE POLICY "diet_meals_delete_own"
      ON public.diet_meals FOR DELETE TO authenticated
      USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'diet_entries' AND policyname = 'diet_entries_select_own'
  ) THEN
    CREATE POLICY "diet_entries_select_own"
      ON public.diet_entries FOR SELECT TO authenticated
      USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'diet_entries' AND policyname = 'diet_entries_insert_own'
  ) THEN
    CREATE POLICY "diet_entries_insert_own"
      ON public.diet_entries FOR INSERT TO authenticated
      WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'diet_entries' AND policyname = 'diet_entries_update_own'
  ) THEN
    CREATE POLICY "diet_entries_update_own"
      ON public.diet_entries FOR UPDATE TO authenticated
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'diet_entries' AND policyname = 'diet_entries_delete_own'
  ) THEN
    CREATE POLICY "diet_entries_delete_own"
      ON public.diet_entries FOR DELETE TO authenticated
      USING (auth.uid() = user_id);
  END IF;
END;
$$;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.diet_meals TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.diet_entries TO authenticated;
GRANT ALL ON public.diet_meals TO service_role;
GRANT ALL ON public.diet_entries TO service_role;

DROP TRIGGER IF EXISTS diet_meals_set_updated_at ON public.diet_meals;
CREATE TRIGGER diet_meals_set_updated_at
  BEFORE UPDATE ON public.diet_meals
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS diet_entries_set_updated_at ON public.diet_entries;
CREATE TRIGGER diet_entries_set_updated_at
  BEFORE UPDATE ON public.diet_entries
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

NOTIFY pgrst, 'reload schema';
