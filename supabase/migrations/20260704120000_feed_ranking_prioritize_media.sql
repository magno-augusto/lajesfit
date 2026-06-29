-- Adiciona "tem midia" como criterio de ranking do feed, entre "nao visto" e
-- "seguido" — dentro de cada grupo existente, publicacoes com foto/video
-- aparecem primeiro.
CREATE OR REPLACE FUNCTION public.get_feed_post_ids(p_user_id UUID, p_limit INT, p_offset INT)
RETURNS TABLE (post_id UUID)
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT p.id
  FROM public.posts p
  LEFT JOIN public.post_views v ON v.post_id = p.id AND v.user_id = p_user_id
  LEFT JOIN public.follows f ON f.following_id = p.user_id AND f.follower_id = p_user_id
  ORDER BY
    (v.user_id IS NOT NULL) ASC,
    (p.media_url IS NULL) ASC,
    (f.follower_id IS NULL) ASC,
    p.created_at DESC
  LIMIT p_limit OFFSET p_offset;
$$;
