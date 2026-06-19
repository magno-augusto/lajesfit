ALTER TABLE public.workouts
  ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS strava_activity_id BIGINT;

CREATE UNIQUE INDEX IF NOT EXISTS workouts_user_strava_activity_idx
  ON public.workouts(user_id, strava_activity_id);

CREATE TABLE IF NOT EXISTS public.strava_tokens (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  athlete_id BIGINT,
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  expires_at BIGINT NOT NULL,
  scope TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.strava_tokens TO authenticated;
GRANT ALL ON public.strava_tokens TO service_role;

ALTER TABLE public.strava_tokens ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "strava_tokens_own_all" ON public.strava_tokens;
CREATE POLICY "strava_tokens_own_all" ON public.strava_tokens
FOR ALL TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

NOTIFY pgrst, 'reload schema';
