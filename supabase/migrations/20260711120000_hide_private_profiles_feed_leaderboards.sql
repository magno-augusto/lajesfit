-- Perfis privados: posts saem do feed de quem nao segue (admins veem tudo)
-- e o usuario sai dos rankings publicos do desafio. Antes, is_private so
-- protegia a pagina de perfil.
CREATE OR REPLACE FUNCTION public.get_feed_post_ids(p_user_id UUID, p_limit INT, p_offset INT)
RETURNS TABLE (post_id UUID)
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT p.id
  FROM public.posts p
  JOIN public.profiles author ON author.id = p.user_id
  LEFT JOIN public.post_views v ON v.post_id = p.id AND v.user_id = p_user_id
  LEFT JOIN public.follows f ON f.following_id = p.user_id AND f.follower_id = p_user_id
  WHERE NOT author.is_private
    OR p.user_id = p_user_id
    OR f.follower_id IS NOT NULL
    OR EXISTS (SELECT 1 FROM public.profiles me WHERE me.id = p_user_id AND me.is_admin)
  ORDER BY
    (v.user_id IS NOT NULL) ASC,
    (p.media_url IS NULL) ASC,
    (f.follower_id IS NULL) ASC,
    p.created_at DESC
  LIMIT p_limit OFFSET p_offset;
$$;

CREATE OR REPLACE FUNCTION public.get_workout_days_leaderboard(p_limit INT DEFAULT 10)
RETURNS TABLE (user_id UUID, username TEXT, display_name TEXT, avatar_url TEXT, active_days INT)
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT w.user_id, p.username, p.display_name, p.avatar_url,
         COUNT(DISTINCT w.performed_at::date)::int AS active_days
  FROM public.workouts w
  JOIN public.profiles p ON p.id = w.user_id
  WHERE w.performed_at >= date_trunc('month', now())
    AND w.performed_at < date_trunc('month', now()) + interval '1 month'
    AND NOT p.is_private
  GROUP BY w.user_id, p.username, p.display_name, p.avatar_url
  ORDER BY active_days DESC
  LIMIT p_limit;
$$;

CREATE OR REPLACE FUNCTION public.get_diet_days_leaderboard(p_limit INT DEFAULT 10)
RETURNS TABLE (user_id UUID, username TEXT, display_name TEXT, avatar_url TEXT, active_days INT)
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT d.user_id, p.username, p.display_name, p.avatar_url,
         COUNT(DISTINCT d.consumed_at::date)::int AS active_days
  FROM public.diet_entries d
  JOIN public.profiles p ON p.id = d.user_id
  WHERE d.consumed_at >= date_trunc('month', now())
    AND d.consumed_at < date_trunc('month', now()) + interval '1 month'
    AND NOT p.is_private
  GROUP BY d.user_id, p.username, p.display_name, p.avatar_url
  ORDER BY active_days DESC
  LIMIT p_limit;
$$;

CREATE OR REPLACE FUNCTION public.get_distance_leaderboard(p_limit INT DEFAULT 10)
RETURNS TABLE (user_id UUID, username TEXT, display_name TEXT, avatar_url TEXT, total_distance_meters NUMERIC)
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT w.user_id, p.username, p.display_name, p.avatar_url,
         SUM(w.distance_meters) AS total_distance_meters
  FROM public.workouts w
  JOIN public.profiles p ON p.id = w.user_id
  WHERE w.performed_at >= date_trunc('month', now())
    AND w.performed_at < date_trunc('month', now()) + interval '1 month'
    AND w.activity_type IN ('Corrida', 'Caminhada', 'Trilha')
    AND w.distance_meters IS NOT NULL
    AND w.distance_meters > 0
    AND NOT p.is_private
  GROUP BY w.user_id, p.username, p.display_name, p.avatar_url
  ORDER BY total_distance_meters DESC
  LIMIT p_limit;
$$;

CREATE OR REPLACE FUNCTION public.get_calories_leaderboard(p_limit INT DEFAULT 10)
RETURNS TABLE (user_id UUID, username TEXT, display_name TEXT, avatar_url TEXT, total_calories NUMERIC)
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT w.user_id, p.username, p.display_name, p.avatar_url,
         SUM(w.calories) AS total_calories
  FROM public.workouts w
  JOIN public.profiles p ON p.id = w.user_id
  WHERE w.performed_at >= date_trunc('month', now())
    AND w.performed_at < date_trunc('month', now()) + interval '1 month'
    AND w.calories IS NOT NULL
    AND w.calories > 0
    AND NOT p.is_private
  GROUP BY w.user_id, p.username, p.display_name, p.avatar_url
  ORDER BY total_calories DESC
  LIMIT p_limit;
$$;
