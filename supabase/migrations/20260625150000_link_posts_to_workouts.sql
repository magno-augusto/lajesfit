ALTER TABLE public.posts
  ADD COLUMN IF NOT EXISTS workout_id UUID REFERENCES public.workouts(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS posts_workout_id_idx ON public.posts(workout_id);

-- Backfill: cria um post para cada treino existente (manual ou Strava) que ainda
-- nao tinha publicacao no feed, preservando a data original do treino.
INSERT INTO public.posts (user_id, content, media_url, workout_id, created_at)
SELECT w.user_id,
       COALESCE(w.title, w.activity_type),
       w.media_url,
       w.id,
       w.performed_at
FROM public.workouts w
WHERE NOT EXISTS (
  SELECT 1 FROM public.posts p WHERE p.workout_id = w.id
);

NOTIFY pgrst, 'reload schema';
