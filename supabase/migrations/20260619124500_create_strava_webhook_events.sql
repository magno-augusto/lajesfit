CREATE TABLE IF NOT EXISTS public.strava_webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id BIGINT,
  owner_id BIGINT NOT NULL,
  object_id BIGINT NOT NULL,
  object_type TEXT NOT NULL,
  aspect_type TEXT NOT NULL,
  event_time BIGINT,
  updates JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'received',
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  processed_at TIMESTAMPTZ
);

CREATE UNIQUE INDEX IF NOT EXISTS strava_webhook_events_unique_idx
  ON public.strava_webhook_events(subscription_id, owner_id, object_id, object_type, aspect_type, event_time);

GRANT ALL ON public.strava_webhook_events TO service_role;

ALTER TABLE public.strava_webhook_events ENABLE ROW LEVEL SECURITY;

NOTIFY pgrst, 'reload schema';
