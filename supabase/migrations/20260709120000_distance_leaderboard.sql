-- Ranking mensal de distancia: soma dos metros percorridos em atividades a pe
-- (corrida, caminhada e trilha) no mes atual.

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
  GROUP BY w.user_id, p.username, p.display_name, p.avatar_url
  ORDER BY total_distance_meters DESC
  LIMIT p_limit;
$$;
GRANT EXECUTE ON FUNCTION public.get_distance_leaderboard(INT) TO authenticated;
