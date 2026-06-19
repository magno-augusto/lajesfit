ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_private BOOLEAN NOT NULL DEFAULT false;

DROP POLICY IF EXISTS "follow_requests_insert_own" ON public.follow_requests;
CREATE POLICY "follow_requests_insert_own" ON public.follow_requests
FOR INSERT TO authenticated
WITH CHECK (
  auth.uid() = requester_id
  AND requester_id <> requested_id
  AND EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = requested_id
      AND is_private = true
  )
  AND NOT EXISTS (
    SELECT 1
    FROM public.follows
    WHERE follower_id = requester_id
      AND following_id = requested_id
  )
);

DROP POLICY IF EXISTS "follows_insert_accepted_request" ON public.follows;
DROP POLICY IF EXISTS "follows_insert_public_or_accepted" ON public.follows;
CREATE POLICY "follows_insert_public_or_accepted" ON public.follows
FOR INSERT TO authenticated
WITH CHECK (
  (
    auth.uid() = follower_id
    AND EXISTS (
      SELECT 1
      FROM public.profiles
      WHERE id = following_id
        AND is_private = false
    )
  )
  OR
  (
    auth.uid() = following_id
    AND EXISTS (
      SELECT 1
      FROM public.follow_requests
      WHERE requester_id = follower_id
        AND requested_id = following_id
    )
  )
);

DROP POLICY IF EXISTS "posts_select_visible_auth" ON public.posts;
CREATE POLICY "posts_select_visible_auth" ON public.posts
FOR SELECT TO authenticated
USING (
  auth.uid() = user_id
  OR EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = posts.user_id
      AND is_private = false
  )
  OR EXISTS (
    SELECT 1
    FROM public.follows
    WHERE follower_id = auth.uid()
      AND following_id = posts.user_id
  )
);

NOTIFY pgrst, 'reload schema';
