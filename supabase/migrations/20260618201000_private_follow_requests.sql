CREATE TABLE IF NOT EXISTS public.follow_requests (
  requester_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  requested_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (requester_id, requested_id),
  CHECK (requester_id <> requested_id)
);

GRANT SELECT, INSERT, DELETE ON public.follow_requests TO authenticated;
GRANT ALL ON public.follow_requests TO service_role;

ALTER TABLE public.follow_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "follow_requests_select_involved" ON public.follow_requests;
DROP POLICY IF EXISTS "follow_requests_insert_own" ON public.follow_requests;
DROP POLICY IF EXISTS "follow_requests_delete_involved" ON public.follow_requests;

CREATE POLICY "follow_requests_select_involved" ON public.follow_requests
FOR SELECT TO authenticated
USING (auth.uid() = requester_id OR auth.uid() = requested_id);

CREATE POLICY "follow_requests_insert_own" ON public.follow_requests
FOR INSERT TO authenticated
WITH CHECK (
  auth.uid() = requester_id
  AND requester_id <> requested_id
  AND NOT EXISTS (
    SELECT 1
    FROM public.follows
    WHERE follower_id = requester_id
      AND following_id = requested_id
  )
);

CREATE POLICY "follow_requests_delete_involved" ON public.follow_requests
FOR DELETE TO authenticated
USING (auth.uid() = requester_id OR auth.uid() = requested_id);

DROP POLICY IF EXISTS "follows_insert_accepted_request" ON public.follows;
DROP POLICY IF EXISTS "follows_insert_own" ON public.follows;
DROP POLICY IF EXISTS "Users create own follows" ON public.follows;
DROP POLICY IF EXISTS "follows_delete_involved" ON public.follows;
DROP POLICY IF EXISTS "follows_delete_own" ON public.follows;
DROP POLICY IF EXISTS "Users delete own follows" ON public.follows;

CREATE POLICY "follows_insert_accepted_request" ON public.follows
FOR INSERT TO authenticated
WITH CHECK (
  auth.uid() = following_id
  AND EXISTS (
    SELECT 1
    FROM public.follow_requests
    WHERE requester_id = follower_id
      AND requested_id = following_id
  )
);

CREATE POLICY "follows_delete_involved" ON public.follows
FOR DELETE TO authenticated
USING (auth.uid() = follower_id OR auth.uid() = following_id);

DROP POLICY IF EXISTS "posts_select_all_auth" ON public.posts;
DROP POLICY IF EXISTS "Posts viewable by authenticated" ON public.posts;
DROP POLICY IF EXISTS "posts_select_visible_auth" ON public.posts;

CREATE POLICY "posts_select_visible_auth" ON public.posts
FOR SELECT TO authenticated
USING (
  auth.uid() = user_id
  OR EXISTS (
    SELECT 1
    FROM public.follows
    WHERE follower_id = auth.uid()
      AND following_id = posts.user_id
  )
);
