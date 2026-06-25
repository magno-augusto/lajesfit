ALTER TABLE public.workouts
  ADD COLUMN IF NOT EXISTS media_url TEXT;
