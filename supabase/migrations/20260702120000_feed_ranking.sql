-- POST VIEWS (rastreia o que cada usuario ja visualizou no feed)
CREATE TABLE public.post_views (
  post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  viewed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (post_id, user_id)
);
GRANT SELECT, INSERT ON public.post_views TO authenticated;
GRANT ALL ON public.post_views TO service_role;
ALTER TABLE public.post_views ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own views" ON public.post_views FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users insert own views" ON public.post_views FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- Ranking do feed: nao vistos antes de vistos, seguidos antes de nao seguidos,
-- e mais recente primeiro dentro de cada grupo.
CREATE OR REPLACE FUNCTION public.get_feed_post_ids(p_user_id UUID, p_limit INT, p_offset INT)
RETURNS TABLE (post_id UUID)
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT p.id
  FROM public.posts p
  LEFT JOIN public.post_views v ON v.post_id = p.id AND v.user_id = p_user_id
  LEFT JOIN public.follows f ON f.following_id = p.user_id AND f.follower_id = p_user_id
  ORDER BY
    (v.user_id IS NOT NULL) ASC,
    (f.follower_id IS NULL) ASC,
    p.created_at DESC
  LIMIT p_limit OFFSET p_offset;
$$;
GRANT EXECUTE ON FUNCTION public.get_feed_post_ids(UUID, INT, INT) TO authenticated;
