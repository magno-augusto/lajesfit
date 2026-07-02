-- Ranking mensal de calorias queimadas: soma das calorias dos treinos
-- registrados no mes atual.

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
  GROUP BY w.user_id, p.username, p.display_name, p.avatar_url
  ORDER BY total_calories DESC
  LIMIT p_limit;
$$;
GRANT EXECUTE ON FUNCTION public.get_calories_leaderboard(INT) TO authenticated;
